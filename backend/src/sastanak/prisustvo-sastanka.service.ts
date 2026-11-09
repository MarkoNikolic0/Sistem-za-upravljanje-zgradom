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
import { SastanakPravaService, smeDaNajavi } from './sastanak-prava.service.js';
import { PORUKA_PROSAO } from './sastanak.constants.js';
import {
  type PodaciPrisustva,
  pregledPrisustva,
  spisakPrisustva,
} from './prisustvo-sastanka.js';
import { stanoviSaStanarima } from '../stanar-stana/stanovi-sa-stanarima.js';
import { type PristupZgradama, sadrzi } from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { VrstaSastanka } from '../shared/enums/sastanak.enums.js';
import { greskaPolja } from '../shared/greske-validacije.js';

const PORUKA_NIJE_POCEO = 'Prisustvo se evidentira kad sednica počne.';

@Injectable()
export class PrisustvoSastankaService {
  constructor(
    @InjectRepository(PotvrdaPrisustva)
    private potvrdaRepository: Repository<PotvrdaPrisustva>,
    @InjectRepository(PrisutanStan)
    private prisutanStanRepository: Repository<PrisutanStan>,
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    private prava: SastanakPravaService,
    private dataSource: DataSource,
  ) {}

  async pregled(sastanak: Sastanak, korisnikId: number, p: PristupZgradama) {
    const podaci = await this.podaci(sastanak);
    return this.saPravima(sastanak, korisnikId, p, podaci);
  }

  async spisak(id: number, korisnikId: number, uloga: Uloga) {
    const { sastanak, p } = await this.prava.findZaUpravljanje(
      id,
      korisnikId,
      uloga,
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
    await this.findZaNajavu(id, korisnikId, uloga);
    await this.dataSource.transaction(async (manager) => {
      await this.zakljucajOtvoren(manager.getRepository(Sastanak), id);
      await manager.delete(PotvrdaPrisustva, {
        sastanak: { id },
        korisnik: { id: korisnikId },
      });
    });
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
    const dostupno = await this.prava.findDostupno(id, korisnikId, uloga);
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

  private async podaci(sastanak: Sastanak): Promise<PodaciPrisustva> {
    const [stanovi, potvrde, prisutni] = await Promise.all([
      stanoviSaStanarima(this.dataSource.manager, sastanak.zgrada.id),
      this.potvrdaRepository.find({
        where: { sastanak: { id: sastanak.id } },
        relations: { korisnik: true },
        select: { id: true, dolazi: true, korisnik: { id: true } },
      }),
      sastanak.datumEvidencije === null
        ? null
        : this.prisutanStanRepository.find({
            where: { sastanak: { id: sastanak.id } },
            relations: { stan: true },
            select: { id: true, stan: { id: true } },
          }),
    ]);
    return {
      vrsta: sastanak.vrsta,
      stanovi,
      odgovori: new Map(potvrde.map((pp) => [pp.korisnik.id, pp.dolazi])),
      prisutni: prisutni && new Set(prisutni.map((ps) => ps.stan.id)),
    };
  }

  private saPravima(
    sastanak: Sastanak,
    korisnikId: number,
    p: PristupZgradama,
    podaci: PodaciPrisustva,
  ) {
    const otkazan = sastanak.datumOtkazivanja !== null;
    const poceo = sastanak.pocetak <= new Date();
    const upravlja = sadrzi(p.upravlja, sastanak.zgrada.id);
    return {
      ...pregledPrisustva(podaci, korisnikId),
      datumEvidencije: sastanak.datumEvidencije,
      smeDaNajavi: smeDaNajavi(sastanak, p) && !otkazan && !poceo,
      smeDaVidiSpisak: upravlja,
      smeDaEvidentira:
        sastanak.vrsta === VrstaSastanka.SKUPSTINA &&
        upravlja &&
        !otkazan &&
        poceo,
    };
  }

  private async saSpiskom(
    sastanak: Sastanak,
    korisnikId: number,
    p: PristupZgradama,
  ) {
    const podaci = await this.podaci(sastanak);
    return {
      ...this.saPravima(sastanak, korisnikId, p, podaci),
      stanovi: spisakPrisustva(podaci),
    };
  }
}
