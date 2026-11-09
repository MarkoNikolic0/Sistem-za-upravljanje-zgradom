import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  Repository,
} from 'typeorm';
import { Sastanak } from './sastanak.entity.js';
import { PotvrdaPrisustva } from './potvrda-prisustva.entity.js';
import { PrisutanStan } from './prisutan-stan.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { DokumentZgrade } from '../dokument-zgrade/dokument-zgrade.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import {
  SAMO_ZGRADA,
  SastanakPravaService,
  smeDaNajavi,
} from './sastanak-prava.service.js';
import { PORUKA_PROSAO } from './sastanak.constants.js';
import {
  type OdgovorStanara,
  pregledPrisustva,
  spisakPrisustva,
} from './prisustvo-sastanka.js';
import { stanoviSaStanarima } from '../stanar-stana/stanovi-sa-stanarima.js';
import { type PristupZgradama, sadrzi } from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { VrstaSastanka } from '../shared/enums/sastanak.enums.js';
import { greskaPolja } from '../shared/greske-validacije.js';

const PORUKA_NIJE_POCEO = 'Prisustvo se evidentira kad sednica počne.';
const PORUKA_ZAPISNIK =
  'Zapisnik je okačen. Ukloni ga da bi izmenio evidenciju.';

@Injectable()
export class PrisustvoSastankaService {
  constructor(
    @InjectRepository(PotvrdaPrisustva)
    private potvrdaRepository: Repository<PotvrdaPrisustva>,
    @InjectRepository(PrisutanStan)
    private prisutanStanRepository: Repository<PrisutanStan>,
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    @InjectRepository(DokumentZgrade)
    private dokumentRepository: Repository<DokumentZgrade>,
    private prava: SastanakPravaService,
    private dataSource: DataSource,
  ) {}

  async pregled(
    sastanak: Sastanak,
    korisnikId: number,
    p: PristupZgradama,
    imaZapisnik?: boolean,
  ) {
    return this.saPotvrdama(
      sastanak,
      korisnikId,
      p,
      await this.potvrde(sastanak.id),
      imaZapisnik,
    );
  }

  async spisak(id: number, korisnikId: number, uloga: Uloga) {
    const { sastanak, p } = await this.prava.findZaUpravljanje(
      id,
      korisnikId,
      uloga,
      SAMO_ZGRADA,
    );
    return this.saSpiskom(sastanak, korisnikId, p);
  }

  async najavi(id: number, korisnikId: number, uloga: Uloga, dolazi: boolean) {
    const { sastanak, p } = await this.findZaNajavu(id, korisnikId, uloga);
    await this.dataSource.transaction(async (manager) => {
      await this.zakljucajOtvoren(manager.getRepository(Sastanak), id);
      await manager.upsert(
        PotvrdaPrisustva,
        { sastanak: { id }, korisnik: { id: korisnikId }, dolazi },
        ['sastanak', 'korisnik'],
      );
    });
    return this.pregled(sastanak, korisnikId, p);
  }

  async povuci(id: number, korisnikId: number, uloga: Uloga) {
    const { sastanak, p } = await this.findZaNajavu(id, korisnikId, uloga);
    await this.dataSource.transaction(async (manager) => {
      await this.zakljucajOtvoren(manager.getRepository(Sastanak), id);
      await manager.delete(PotvrdaPrisustva, {
        sastanak: { id },
        korisnik: { id: korisnikId },
      });
    });
    return this.pregled(sastanak, korisnikId, p);
  }

  async evidentiraj(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    stanovi: number[],
  ) {
    const { sastanak, p } = await this.prava.findZaUpravljanje(
      id,
      korisnikId,
      uloga,
      SAMO_ZGRADA,
    );
    if (sastanak.vrsta !== VrstaSastanka.SKUPSTINA) {
      throw new ConflictException('Prisustvo se evidentira samo na skupštini.');
    }
    if (sastanak.datumOtkazivanja !== null) {
      throw new ConflictException('Sastanak je otkazan.');
    }
    if (sastanak.pocetak > new Date()) {
      throw new ConflictException(PORUKA_NIJE_POCEO);
    }
    if (stanovi.length > 0) {
      const uZgradi = await this.stanRepository.countBy({
        id: In(stanovi),
        zgrada: { id: sastanak.zgrada.id },
      });
      if (uZgradi !== stanovi.length) {
        throw greskaPolja('stanovi', 'Izabran stan nije u ovoj zgradi.');
      }
    }

    await this.dataSource.transaction(async (manager) => {
      const zakljucan = await manager.findOne(Sastanak, {
        where: { id, pocetak: LessThanOrEqual(new Date()) },
        select: { id: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!zakljucan) {
        throw new ConflictException(PORUKA_NIJE_POCEO);
      }
      if (await manager.existsBy(DokumentZgrade, { sastanakId: id })) {
        throw new ConflictException(PORUKA_ZAPISNIK);
      }
      await manager.delete(PrisutanStan, { sastanak: { id } });
      if (stanovi.length > 0) {
        await manager.insert(
          PrisutanStan,
          stanovi.map((stanId) => ({ sastanak: { id }, stan: { id: stanId } })),
        );
      }
      sastanak.datumEvidencije = new Date();
      await manager.update(Sastanak, id, {
        datumEvidencije: sastanak.datumEvidencije,
      });
    });
    return this.saSpiskom(sastanak, korisnikId, p);
  }

  private async findZaNajavu(id: number, korisnikId: number, uloga: Uloga) {
    const dostupno = await this.prava.findDostupno(
      id,
      korisnikId,
      uloga,
      SAMO_ZGRADA,
    );
    if (!smeDaNajavi(dostupno.sastanak, dostupno.p)) {
      throw new ForbiddenException(
        dostupno.sastanak.vrsta === VrstaSastanka.SKUPSTINA
          ? 'Dolazak na skupštinu najavljuju vlasnici stanova u zgradi.'
          : 'Dolazak najavljuju stanari zgrade.',
      );
    }
    return dostupno;
  }

  private async zakljucajOtvoren(repo: Repository<Sastanak>, id: number) {
    const otvoren = await repo.findOne({
      where: { id, pocetak: MoreThan(new Date()), datumOtkazivanja: IsNull() },
      select: { id: true },
      lock: { mode: 'pessimistic_read' },
    });
    if (!otvoren) {
      throw new ConflictException(PORUKA_PROSAO);
    }
  }

  private potvrde(sastanakId: number) {
    return this.potvrdaRepository.find({
      where: { sastanak: { id: sastanakId } },
      relations: { korisnik: true },
      select: { id: true, dolazi: true, korisnik: { id: true } },
    });
  }

  private async odgovori(
    zgradaId: number,
    potvrde: PotvrdaPrisustva[],
  ): Promise<OdgovorStanara[]> {
    if (potvrde.length === 0) {
      return [];
    }
    const dolazi = new Map(potvrde.map((pp) => [pp.korisnik.id, pp.dolazi]));
    const veze = await this.dataSource.manager.find(StanarStana, {
      where: {
        stan: { zgrada: { id: zgradaId } },
        korisnik: { id: In([...dolazi.keys()]) },
      },
      relations: { stan: true, korisnik: true },
      select: {
        id: true,
        vlasnik: true,
        stan: { id: true },
        korisnik: { id: true },
      },
    });
    return veze.map((v) => ({
      korisnikId: v.korisnik.id,
      stanId: v.stan.id,
      vlasnik: v.vlasnik,
      dolazi: dolazi.get(v.korisnik.id) ?? false,
    }));
  }

  private async saPotvrdama(
    sastanak: Sastanak,
    korisnikId: number,
    p: PristupZgradama,
    potvrde: PotvrdaPrisustva[],
    imaZapisnik?: boolean,
  ) {
    const otkazan = sastanak.datumOtkazivanja !== null;
    const poceo = sastanak.pocetak <= new Date();
    const upravlja = sadrzi(p.upravlja, sastanak.zgrada.id);
    const mozeEvidencija =
      sastanak.vrsta === VrstaSastanka.SKUPSTINA &&
      upravlja &&
      !otkazan &&
      poceo;
    const [ukupnoStanova, odgovori, prisutno, zakljucana] = await Promise.all([
      this.stanRepository.countBy({ zgrada: { id: sastanak.zgrada.id } }),
      this.odgovori(sastanak.zgrada.id, potvrde),
      sastanak.datumEvidencije === null
        ? null
        : this.prisutanStanRepository.countBy({
            sastanak: { id: sastanak.id },
          }),
      mozeEvidencija &&
        (imaZapisnik ??
          this.dokumentRepository.existsBy({ sastanakId: sastanak.id })),
    ]);
    return {
      ...pregledPrisustva(
        { vrsta: sastanak.vrsta, ukupnoStanova, odgovori, prisutno },
        korisnikId,
      ),
      datumEvidencije: sastanak.datumEvidencije,
      smeDaNajavi: smeDaNajavi(sastanak, p) && !otkazan && !poceo,
      smeDaVidiSpisak: upravlja,
      smeDaEvidentira: mozeEvidencija && !zakljucana,
    };
  }

  private async saSpiskom(
    sastanak: Sastanak,
    korisnikId: number,
    p: PristupZgradama,
  ) {
    const potvrde = await this.potvrde(sastanak.id);
    const [pregled, stanovi, prisutni] = await Promise.all([
      this.saPotvrdama(sastanak, korisnikId, p, potvrde),
      stanoviSaStanarima(this.dataSource.manager, sastanak.zgrada.id),
      sastanak.datumEvidencije === null
        ? []
        : this.prisutanStanRepository.find({
            where: { sastanak: { id: sastanak.id } },
            relations: { stan: true },
            select: { id: true, stan: { id: true } },
          }),
    ]);
    return {
      ...pregled,
      stanovi: spisakPrisustva(
        sastanak.vrsta,
        stanovi,
        new Map(potvrde.map((pp) => [pp.korisnik.id, pp.dolazi])),
        new Set(prisutni.map((ps) => ps.stan.id)),
      ),
    };
  }
}
