import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { brojPoZgradi } from './broj-po-zgradi.js';
import { Zgrada } from './zgrada.entity.js';
import { AKTIVNA_ZGRADA } from './aktivna-zgrada.js';
import { Kvar } from '../kvar/kvar.entity.js';
import { Glasanje } from '../glasanje/glasanje.entity.js';
import { Sastanak } from '../sastanak/sastanak.entity.js';
import { ZahtevPovezivanje } from '../zahtev-povezivanje/zahtev-povezivanje.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { Prioritet, StatusKvara } from '../shared/enums/kvar.enums.js';
import { VrstaGlasanja } from '../shared/enums/glasanje.enums.js';
import { StatusZahteva } from '../shared/enums/status-zahteva.enum.js';
import { OTVORENI_STATUSI } from '../kvar/kvar.constants.js';
import { POCETAK_DANA } from '../shared/vreme.js';

type SledeciSastanak = Pick<
  Sastanak,
  'id' | 'naslov' | 'pocetak' | 'vrsta' | 'hitno'
>;

export interface PregledZgrade {
  zgrada: Pick<Zgrada, 'id' | 'naziv'>;
  zahteviNaCekanju: number;
  noviKvarovi: number;
  hitniKvarovi: number;
  neobjavljeneOdluke: number;
  sledeciSastanak: SledeciSastanak | null;
}

@Injectable()
export class ZgradaPregledService {
  constructor(
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
    @InjectRepository(Kvar) private kvarRepository: Repository<Kvar>,
    @InjectRepository(Glasanje)
    private glasanjeRepository: Repository<Glasanje>,
    @InjectRepository(Sastanak)
    private sastanakRepository: Repository<Sastanak>,
    @InjectRepository(ZahtevPovezivanje)
    private zahtevRepository: Repository<ZahtevPovezivanje>,
    private korisnikService: KorisnikService,
  ) {}

  async pregled(korisnikId: number, uloga: Uloga): Promise<PregledZgrade[]> {
    const zgrade = await this.zgradeZaPregled(korisnikId, uloga);
    if (zgrade.length === 0) {
      return [];
    }
    const ids = zgrade.map((z) => z.id);

    const [zahtevi, novi, hitni, odluke, sastanci] = await Promise.all([
      brojPoZgradi(
        this.zahtevRepository
          .createQueryBuilder('zahtev')
          .innerJoin('zahtev.stan', 'stan')
          .where('zahtev.status = :status', {
            status: StatusZahteva.NA_CEKANJU,
          }),
        'stan.zgradaId',
        ids,
      ),
      brojPoZgradi(
        this.kvarRepository
          .createQueryBuilder('kvar')
          .where('kvar.status = :status', { status: StatusKvara.PRIJAVLJEN })
          .andWhere('kvar.prioritet <> :prioritet', {
            prioritet: Prioritet.HITNO,
          }),
        'kvar.zgradaId',
        ids,
      ),
      brojPoZgradi(
        this.kvarRepository
          .createQueryBuilder('kvar')
          .where('kvar.prioritet = :prioritet', { prioritet: Prioritet.HITNO })
          .andWhere('kvar.status IN (:...statusi)', {
            statusi: OTVORENI_STATUSI,
          }),
        'kvar.zgradaId',
        ids,
      ),
      brojPoZgradi(
        this.glasanjeRepository
          .createQueryBuilder('glasanje')
          .where('glasanje.vrsta = :vrsta', { vrsta: VrstaGlasanja.ODLUKA })
          .andWhere('glasanje.rok <= now()')
          .andWhere(
            'NOT EXISTS (SELECT 1 FROM oglas WHERE oglas."glasanjeId" = glasanje.id)',
          ),
        'glasanje.zgradaId',
        ids,
      ),
      this.sledeciSastanci(ids),
    ]);

    return zgrade.map((zgrada) => ({
      zgrada,
      zahteviNaCekanju: zahtevi.get(zgrada.id) ?? 0,
      noviKvarovi: novi.get(zgrada.id) ?? 0,
      hitniKvarovi: hitni.get(zgrada.id) ?? 0,
      neobjavljeneOdluke: odluke.get(zgrada.id) ?? 0,
      sledeciSastanak: sastanci.get(zgrada.id) ?? null,
    }));
  }

  private async zgradeZaPregled(korisnikId: number, uloga: Uloga) {
    if (uloga === Uloga.ADMIN) {
      return await this.zgradaRepository.find({
        select: { id: true, naziv: true },
        where: AKTIVNA_ZGRADA,
        order: { naziv: 'ASC' },
      });
    }
    const zgradaId = await this.korisnikService.zgradaUpravnika(korisnikId);
    if (zgradaId === null) {
      return [];
    }
    return await this.zgradaRepository.find({
      select: { id: true, naziv: true },
      where: { id: zgradaId },
    });
  }

  private async sledeciSastanci(ids: number[]) {
    const redovi = await this.sastanakRepository
      .createQueryBuilder('sastanak')
      .select([
        'sastanak.id AS id',
        'sastanak.naslov AS naslov',
        'sastanak.pocetak AS pocetak',
        'sastanak.vrsta AS vrsta',
        'sastanak.hitno AS hitno',
        'sastanak.zgradaId AS "zgradaId"',
      ])
      .distinctOn(['sastanak.zgradaId'])
      .where('sastanak.zgradaId IN (:...ids)', { ids })
      .andWhere('sastanak.datumOtkazivanja IS NULL')
      .andWhere(`sastanak.pocetak >= ${POCETAK_DANA}`)
      .orderBy('sastanak.zgradaId')
      .addOrderBy('sastanak.pocetak', 'ASC')
      .getRawMany<SledeciSastanak & { zgradaId: number }>();
    return new Map(
      redovi.map(({ zgradaId, ...sastanak }) => [zgradaId, sastanak]),
    );
  }
}
