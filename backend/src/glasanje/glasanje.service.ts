import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { Glasanje } from './glasanje.entity.js';
import { Glas, JEDAN_GLAS_ANKETE, JEDAN_GLAS_STANA } from './glas.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { Oglas } from '../oglas/oglas.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import {
  type PristupZgradama,
  sadrzi,
  samoZgrada,
} from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import {
  StanjeGlasanja,
  VrstaGlasanja,
} from '../shared/enums/glasanje.enums.js';
import { Stranica, stranicenje } from '../shared/stranicenje.js';
import { greskaPolja } from '../shared/greske-validacije.js';
import { CreateGlasanjeDto } from './dto/create-glasanje.dto.js';
import { GlasanjeUpitDto } from './dto/glasanje-upit.dto.js';
import {
  ODGOVORI_ODLUKE,
  ZA,
  ishodOdluke,
  pragoviOdluke,
} from './ishod-odluke.js';

const PORUKA_ZAVRSENA = 'Glasanje je završeno.';
const PORUKA_VLASNICI = 'Za odluke glasaju vlasnici stanova u zgradi.';

// Odluke vide samo vlasnici stanova u zgradi, upravnik i admin
function zgradeOdluka(p: PristupZgradama) {
  return p.upravlja === null
    ? null
    : [...new Set([...p.poseduje, ...p.upravlja])];
}

@Injectable()
export class GlasanjeService {
  constructor(
    @InjectRepository(Glasanje)
    private glasanjeRepository: Repository<Glasanje>,
    @InjectRepository(Glas) private glasRepository: Repository<Glas>,
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
    @InjectRepository(Oglas) private oglasRepository: Repository<Oglas>,
    private korisnikService: KorisnikService,
    private dataSource: DataSource,
  ) {}

  async findAll(
    korisnikId: number,
    uloga: Uloga,
    upit: GlasanjeUpitDto,
  ): Promise<Stranica<Glasanje>> {
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    const aktivna = upit.stanje === StanjeGlasanja.AKTIVNA;
    const sada = new Date();
    const rok = aktivna ? MoreThan(sada) : LessThanOrEqual(sada);

    const uslovi = [
      { vrsta: VrstaGlasanja.ANKETA, zgrade: p.zgrade },
      { vrsta: VrstaGlasanja.ODLUKA, zgrade: zgradeOdluka(p) },
    ]
      .map(({ vrsta, zgrade }) => ({
        vrsta,
        zgrade: samoZgrada(zgrade, upit.zgradaId),
      }))
      .filter(({ zgrade }) => zgrade?.length !== 0)
      .map(({ vrsta, zgrade }) => ({
        vrsta,
        rok,
        ...(zgrade === null ? {} : { zgrada: { id: In(zgrade) } }),
      }));
    if (uslovi.length === 0) {
      return { stavke: [], ukupno: 0 };
    }

    const [stavke, ukupno] = await this.glasanjeRepository.findAndCount({
      where: uslovi,
      relations: { zgrada: true, kreirao: true, opcije: true },
      // Bez reda po opcijama: uz LIMIT bi TypeORM brojao redove anketa×opcija, a ne ankete
      order: { rok: aktivna ? 'ASC' : 'DESC', id: 'DESC' },
      ...stranicenje(upit),
    });

    return {
      stavke: await this.saRezultatima(stavke, korisnikId, p, sada),
      ukupno,
    };
  }

  async findOne(id: number, korisnikId: number, uloga: Uloga) {
    const { glasanje, p } = await this.findDostupno(id, korisnikId, uloga);
    const [rezultat] = await this.saRezultatima([glasanje], korisnikId, p);
    return rezultat;
  }

  async create(korisnikId: number, uloga: Uloga, dto: CreateGlasanjeDto) {
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    if (!sadrzi(p.upravlja, dto.zgradaId)) {
      throw new ForbiddenException('Glasanje pravi upravnik zgrade.');
    }
    if (
      p.upravlja === null &&
      !(await this.zgradaRepository.existsBy({ id: dto.zgradaId }))
    ) {
      throw new NotFoundException(
        `Zgrada sa id-jem ${dto.zgradaId} ne postoji!`,
      );
    }
    const odluka = dto.vrsta === VrstaGlasanja.ODLUKA;
    if (odluka && dto.opcije !== undefined) {
      throw greskaPolja('opcije', 'Odluka ima opcije Za, Protiv i Uzdržan.');
    }
    if (!odluka && dto.vecina !== undefined) {
      throw greskaPolja('vecina', 'Većina se bira samo za odluku.');
    }

    const { id } = await this.glasanjeRepository.save(
      this.glasanjeRepository.create({
        vrsta: dto.vrsta,
        vecina: dto.vecina ?? null,
        ukupnoStanova: odluka
          ? await this.stanRepository.countBy({ zgrada: { id: dto.zgradaId } })
          : null,
        pitanje: dto.pitanje,
        opis: dto.opis || null,
        rok: dto.rok,
        zgrada: { id: dto.zgradaId },
        kreirao: { id: korisnikId },
        opcije: (dto.opcije ?? ODGOVORI_ODLUKE).map((tekst) => ({ tekst })),
      }),
    );
    return this.jedno(id, korisnikId, p);
  }

  async glasaj(id: number, korisnikId: number, uloga: Uloga, opcijaId: number) {
    const { glasanje, p } = await this.findZaGlasanje(id, korisnikId, uloga);
    if (!glasanje.opcije.some((opcija) => opcija.id === opcijaId)) {
      throw greskaPolja('opcijaId', 'Izabrana opcija nije u ovom glasanju.');
    }

    await this.dataSource.transaction(async (manager) => {
      await this.proveriDaJeOtvoreno(manager, id);
      if (glasanje.vrsta === VrstaGlasanja.ODLUKA) {
        await this.glasajZaStanove(manager, glasanje, korisnikId, opcijaId, p);
        return;
      }
      // Novi glas ili promena postojeceg, u jednom upitu
      await manager
        .createQueryBuilder()
        .insert()
        .into(Glas)
        .values({
          glasanje: { id },
          opcija: { id: opcijaId },
          korisnik: { id: korisnikId },
        })
        .orUpdate(['opcijaId', 'datumGlasanja'], ['glasanjeId', 'korisnikId'], {
          indexPredicate: JEDAN_GLAS_ANKETE,
        })
        .execute();
    });
    return this.jedno(id, korisnikId, p);
  }

  async povuciGlas(id: number, korisnikId: number, uloga: Uloga) {
    const { glasanje, p } = await this.findZaGlasanje(id, korisnikId, uloga);
    await this.dataSource.transaction(async (manager) => {
      await this.proveriDaJeOtvoreno(manager, id);
      await manager.delete(Glas, {
        glasanje: { id },
        korisnik: { id: korisnikId },
        stan:
          glasanje.vrsta === VrstaGlasanja.ODLUKA ? Not(IsNull()) : IsNull(),
      });
    });
    return this.jedno(id, korisnikId, p);
  }

  async zatvori(id: number, korisnikId: number, uloga: Uloga) {
    const { glasanje, p } = await this.findZaUpravljanje(id, korisnikId, uloga);
    // Ranim zatvaranjem bi se odluka mogla zatvoriti baš kad ishod odgovara
    if (glasanje.vrsta === VrstaGlasanja.ODLUKA) {
      throw new ConflictException('Odluka traje do roka.');
    }
    const sada = new Date();
    const rezultat = await this.glasanjeRepository.update(
      { id, rok: MoreThan(sada) },
      { rok: sada, zatvorenoRanije: true },
    );
    if (rezultat.affected === 0) {
      throw new ConflictException(PORUKA_ZAVRSENA);
    }
    return this.jedno(id, korisnikId, p);
  }

  async remove(id: number, korisnikId: number, uloga: Uloga) {
    await this.findZaUpravljanje(id, korisnikId, uloga);
    await this.glasanjeRepository.delete(id);
  }

  async proveriObjavu(glasanjeId: number, zgradaId: number) {
    const odluka = await this.glasanjeRepository.findOneBy({
      id: glasanjeId,
      vrsta: VrstaGlasanja.ODLUKA,
      zgrada: { id: zgradaId },
    });
    if (!odluka) {
      throw new NotFoundException(
        `Odluka sa id-jem ${glasanjeId} ne postoji u ovoj zgradi!`,
      );
    }
    if (odluka.rok > new Date()) {
      throw new ConflictException('Odluka se objavljuje posle roka.');
    }
    if (await this.oglasRepository.existsBy({ glasanje: { id: glasanjeId } })) {
      throw new ConflictException('Odluka je već objavljena.');
    }
  }

  private async findDostupno(id: number, korisnikId: number, uloga: Uloga) {
    const glasanje = await this.glasanjeRepository.findOne({
      where: { id },
      relations: { zgrada: true, kreirao: true, opcije: true },
    });
    if (!glasanje) {
      throw new NotFoundException(`Glasanje sa id-jem ${id} ne postoji!`);
    }
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    const zgrade =
      glasanje.vrsta === VrstaGlasanja.ODLUKA ? zgradeOdluka(p) : p.zgrade;
    if (!sadrzi(zgrade, glasanje.zgrada.id)) {
      throw new ForbiddenException('Nemate pristup ovom glasanju!');
    }
    return { glasanje, p };
  }

  private async findZaGlasanje(id: number, korisnikId: number, uloga: Uloga) {
    const dostupno = await this.findDostupno(id, korisnikId, uloga);
    const { glasanje, p } = dostupno;
    if (glasanje.vrsta === VrstaGlasanja.ODLUKA) {
      if (!p.poseduje.includes(glasanje.zgrada.id)) {
        throw new ForbiddenException(PORUKA_VLASNICI);
      }
    } else if (!p.stanuje.includes(glasanje.zgrada.id)) {
      throw new ForbiddenException('Glasaju stanari ove zgrade.');
    }
    return dostupno;
  }

  private async findZaUpravljanje(
    id: number,
    korisnikId: number,
    uloga: Uloga,
  ) {
    const dostupno = await this.findDostupno(id, korisnikId, uloga);
    if (!sadrzi(dostupno.p.upravlja, dostupno.glasanje.zgrada.id)) {
      throw new ForbiddenException('Glasanjem upravlja upravnik zgrade.');
    }
    return dostupno;
  }

  private async proveriDaJeOtvoreno(manager: EntityManager, id: number) {
    const otvoreno = await manager.findOne(Glasanje, {
      where: { id, rok: MoreThan(new Date()) },
      select: { id: true },
      lock: { mode: 'pessimistic_read' },
    });
    if (!otvoreno) {
      throw new ConflictException(PORUKA_ZAVRSENA);
    }
  }

  private async glasajZaStanove(
    manager: EntityManager,
    glasanje: Glasanje,
    korisnikId: number,
    opcijaId: number,
    p: PristupZgradama,
  ) {
    const stanovi = p.vlasnickiStanovi
      .filter((stan) => stan.zgradaId === glasanje.zgrada.id)
      .map((stan) => stan.id);
    if (stanovi.length === 0) {
      throw new ForbiddenException(PORUKA_VLASNICI);
    }

    const { raw } = await manager
      .createQueryBuilder()
      .insert()
      .into(Glas)
      .values(
        stanovi.map((stanId) => ({
          glasanje: { id: glasanje.id },
          opcija: { id: opcijaId },
          korisnik: { id: korisnikId },
          stan: { id: stanId },
        })),
      )
      .orUpdate(['opcijaId', 'datumGlasanja'], ['glasanjeId', 'stanId'], {
        indexPredicate: JEDAN_GLAS_STANA,
        overwriteCondition: { where: { korisnik: { id: korisnikId } } },
      })
      .execute();
    if (raw.length === 0) {
      throw new ConflictException('Za tvoj stan je već glasao suvlasnik.');
    }
  }

  private async jedno(id: number, korisnikId: number, p: PristupZgradama) {
    const glasanje = await this.glasanjeRepository.findOneOrFail({
      where: { id },
      relations: { zgrada: true, kreirao: true, opcije: true },
    });
    const [rezultat] = await this.saRezultatima([glasanje], korisnikId, p);
    return rezultat;
  }

  private async saRezultatima(
    glasanja: Glasanje[],
    korisnikId: number,
    p: PristupZgradama,
    sada = new Date(),
  ) {
    if (glasanja.length === 0) {
      return [];
    }
    const ids = glasanja.map((g) => g.id);
    const zgrade = [...new Set(glasanja.map((g) => g.zgrada.id))];
    const odluke = glasanja
      .filter((g) => g.vrsta === VrstaGlasanja.ODLUKA)
      .map((g) => g.id);

    const [poOpciji, moji, stanari, glasoviStanova, objave] = await Promise.all(
      [
        this.glasRepository
          .createQueryBuilder('glas')
          .select('glas.opcijaId', 'opcijaId')
          .addSelect('COUNT(*)::int', 'broj')
          .where('glas.glasanjeId IN (:...ids)', { ids })
          .groupBy('glas.opcijaId')
          .getRawMany<{ opcijaId: number; broj: number }>(),
        this.glasRepository.find({
          where: {
            glasanje: { id: In(ids) },
            korisnik: { id: korisnikId },
            stan: IsNull(),
          },
          relations: { glasanje: true, opcija: true },
          select: { id: true, glasanje: { id: true }, opcija: { id: true } },
        }),
        // Pravo glasa u anketi ima svako ko ima stan u zgradi (vlasnik i ukucanin)
        this.stanarStanaRepository
          .createQueryBuilder('veza')
          .innerJoin('veza.stan', 'stan')
          .select('stan.zgradaId', 'zgradaId')
          .addSelect('COUNT(DISTINCT veza.korisnikId)::int', 'broj')
          .where('stan.zgradaId IN (:...zgrade)', { zgrade })
          .groupBy('stan.zgradaId')
          .getRawMany<{ zgradaId: number; broj: number }>(),
        odluke.length === 0
          ? []
          : this.glasoviMojihStanova(odluke, korisnikId, p),
        odluke.length === 0
          ? []
          : this.oglasRepository.find({
              where: { glasanje: { id: In(odluke) } },
              relations: { glasanje: true },
              select: { id: true, glasanje: { id: true } },
            }),
      ],
    );

    const brojPoOpciji = new Map(poOpciji.map((r) => [r.opcijaId, r.broj]));
    const mojGlasPoAnketi = new Map(
      moji.map((glas) => [glas.glasanje.id, glas.opcija.id]),
    );
    const stanaraPoZgradi = new Map(stanari.map((r) => [r.zgradaId, r.broj]));
    const oglasPoOdluci = new Map(
      objave.map((oglas) => [oglas.glasanje?.id, oglas.id]),
    );

    return glasanja.map((glasanje) => {
      const zgradaId = glasanje.zgrada.id;
      const odluka = glasanje.vrsta === VrstaGlasanja.ODLUKA;
      const zavrseno = glasanje.rok <= sada;
      const upravlja = sadrzi(p.upravlja, zgradaId);

      const brojMojihStanova = p.vlasnickiStanovi.filter(
        (stan) => stan.zgradaId === zgradaId,
      ).length;
      const glasoviMojihStanova = glasoviStanova.filter(
        (glas) => glas.glasanjeId === glasanje.id,
      );
      const mojGlas = odluka
        ? (glasoviMojihStanova.find((glas) => glas.moj)?.opcijaId ?? null)
        : (mojGlasPoAnketi.get(glasanje.id) ?? null);
      // U odluci glasa vlasnik koji je već glasao ili ima stan za koji niko nije glasao
      const imaPravoGlasa = odluka
        ? mojGlas !== null || brojMojihStanova > glasoviMojihStanova.length
        : p.stanuje.includes(zgradaId);
      // Stanar vidi rezultate tek kad je glasano za njega (u odluci za njegov stan),
      // da ga tuđi glasovi ne bi usmerili
      const vidiRezultate =
        upravlja ||
        zavrseno ||
        mojGlas !== null ||
        glasoviMojihStanova.length > 0;

      const opcije = glasanje.opcije.toSorted((a, b) => a.id - b.id);
      const brojevi = opcije.map((o) => brojPoOpciji.get(o.id) ?? 0);
      const brojGlasaca = brojevi.reduce((zbir, broj) => zbir + broj, 0);
      const ukupnoGlasaca = odluka
        ? (glasanje.ukupnoStanova ?? 0)
        : (stanaraPoZgradi.get(zgradaId) ?? 0);
      const za = brojevi[opcije.findIndex((o) => o.tekst === ZA)] ?? 0;
      const oglasId = oglasPoOdluci.get(glasanje.id) ?? null;

      return Object.assign(glasanje, {
        opcije: opcije.map((opcija, i) => ({
          id: opcija.id,
          tekst: opcija.tekst,
          brojGlasova: vidiRezultate ? brojevi[i] : null,
        })),
        mojGlas,
        glasaliSuvlasnici: glasoviMojihStanova
          .filter((glas) => !glas.moj)
          .map((glas) => glas.stan),
        brojGlasaca,
        brojZa: odluka && vidiRezultate ? za : null,
        ukupnoGlasaca,
        zavrseno,
        ishod:
          glasanje.vecina !== null && zavrseno
            ? ishodOdluke(glasanje.vecina, za, brojGlasaca, ukupnoGlasaca)
            : null,
        pragovi:
          glasanje.vecina === null
            ? null
            : pragoviOdluke(glasanje.vecina, brojGlasaca, ukupnoGlasaca),
        oglasId,
        smeDaGlasa: !zavrseno && imaPravoGlasa,
        smeDaZatvori: !zavrseno && !odluka && upravlja,
        smeDaObrise: upravlja,
        smeDaObjavi: zavrseno && odluka && upravlja && oglasId === null,
      });
    });
  }

  // Glasovi u datim odlukama za stanove u kojima je korisnik vlasnik
  private async glasoviMojihStanova(
    odluke: number[],
    korisnikId: number,
    p: PristupZgradama,
  ) {
    if (p.vlasnickiStanovi.length === 0) {
      return [];
    }
    const glasovi = await this.glasRepository.find({
      where: {
        glasanje: { id: In(odluke) },
        stan: { id: In(p.vlasnickiStanovi.map((stan) => stan.id)) },
      },
      relations: { glasanje: true, opcija: true, korisnik: true, stan: true },
      select: {
        id: true,
        glasanje: { id: true },
        opcija: { id: true },
        korisnik: { id: true },
        stan: { id: true, broj: true },
      },
    });
    return glasovi.map((glas) => ({
      glasanjeId: glas.glasanje.id,
      opcijaId: glas.opcija.id,
      stan: glas.stan?.broj ?? '',
      moj: glas.korisnik.id === korisnikId,
    }));
  }
}
