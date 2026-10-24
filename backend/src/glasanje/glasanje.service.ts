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
  Repository,
} from 'typeorm';
import { Glasanje } from './glasanje.entity.js';
import { Glas, JEDAN_GLAS_ANKETE } from './glas.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
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

const PORUKA_ZAVRSENA = 'Glasanje je završeno.';

@Injectable()
export class GlasanjeService {
  constructor(
    @InjectRepository(Glasanje)
    private glasanjeRepository: Repository<Glasanje>,
    @InjectRepository(Glas) private glasRepository: Repository<Glas>,
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
    private korisnikService: KorisnikService,
    private dataSource: DataSource,
  ) {}

  async findAll(
    korisnikId: number,
    uloga: Uloga,
    upit: GlasanjeUpitDto,
  ): Promise<Stranica<Glasanje>> {
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    const zgrade = samoZgrada(p.zgrade, upit.zgradaId);
    if (zgrade?.length === 0) {
      return { stavke: [], ukupno: 0 };
    }

    const aktivna = upit.stanje === StanjeGlasanja.AKTIVNA;
    const sada = new Date();
    const [stavke, ukupno] = await this.glasanjeRepository.findAndCount({
      where: {
        ...(zgrade === null ? {} : { zgrada: { id: In(zgrade) } }),
        rok: aktivna ? MoreThan(sada) : LessThanOrEqual(sada),
      },
      relations: { zgrada: true, kreirao: true, opcije: true },
      order: {
        rok: aktivna ? 'ASC' : 'DESC',
        id: 'DESC',
        opcije: { id: 'ASC' },
      },
      ...stranicenje(upit),
    });

    return {
      stavke: await this.saRezultatima(stavke, korisnikId, p),
      ukupno,
    };
  }

  async create(korisnikId: number, uloga: Uloga, dto: CreateGlasanjeDto) {
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    if (!sadrzi(p.upravlja, dto.zgradaId)) {
      throw new ForbiddenException('Anketu pravi upravnik zgrade.');
    }
    if (
      p.upravlja === null &&
      !(await this.zgradaRepository.existsBy({ id: dto.zgradaId }))
    ) {
      throw new NotFoundException(
        `Zgrada sa id-jem ${dto.zgradaId} ne postoji!`,
      );
    }

    const { id } = await this.glasanjeRepository.save(
      this.glasanjeRepository.create({
        vrsta: VrstaGlasanja.ANKETA,
        pitanje: dto.pitanje,
        opis: dto.opis || null,
        rok: dto.rok,
        zgrada: { id: dto.zgradaId },
        kreirao: { id: korisnikId },
        opcije: dto.opcije.map((tekst) => ({ tekst })),
      }),
    );
    return this.jedno(id, korisnikId, p);
  }

  async glasaj(id: number, korisnikId: number, uloga: Uloga, opcijaId: number) {
    const { glasanje, p } = await this.findZaGlasanje(id, korisnikId, uloga);
    if (!glasanje.opcije.some((opcija) => opcija.id === opcijaId)) {
      throw greskaPolja('opcijaId', 'Izabrana opcija nije u ovoj anketi.');
    }

    await this.dataSource.transaction(async (manager) => {
      await this.proveriDaJeOtvoreno(manager, id);
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
    const { p } = await this.findZaGlasanje(id, korisnikId, uloga);
    await this.dataSource.transaction(async (manager) => {
      await this.proveriDaJeOtvoreno(manager, id);
      await manager.delete(Glas, {
        glasanje: { id },
        korisnik: { id: korisnikId },
        stan: IsNull(),
      });
    });
    return this.jedno(id, korisnikId, p);
  }

  async zatvori(id: number, korisnikId: number, uloga: Uloga) {
    const { p } = await this.findZaUpravljanje(id, korisnikId, uloga);
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

  private async findDostupno(id: number, korisnikId: number, uloga: Uloga) {
    const glasanje = await this.glasanjeRepository.findOne({
      where: { id },
      relations: { zgrada: true, kreirao: true, opcije: true },
      order: { opcije: { id: 'ASC' } },
    });
    if (!glasanje) {
      throw new NotFoundException(`Glasanje sa id-jem ${id} ne postoji!`);
    }
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    if (!sadrzi(p.zgrade, glasanje.zgrada.id)) {
      throw new ForbiddenException('Nemate pristup ovom glasanju!');
    }
    return { glasanje, p };
  }

  private async findZaGlasanje(id: number, korisnikId: number, uloga: Uloga) {
    const dostupno = await this.findDostupno(id, korisnikId, uloga);
    if (!dostupno.p.stanuje.includes(dostupno.glasanje.zgrada.id)) {
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
      throw new ForbiddenException('Anketom upravlja upravnik zgrade.');
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

  private async jedno(id: number, korisnikId: number, p: PristupZgradama) {
    const glasanje = await this.glasanjeRepository.findOneOrFail({
      where: { id },
      relations: { zgrada: true, kreirao: true, opcije: true },
      order: { opcije: { id: 'ASC' } },
    });
    const [rezultat] = await this.saRezultatima([glasanje], korisnikId, p);
    return rezultat;
  }

  private async saRezultatima(
    glasanja: Glasanje[],
    korisnikId: number,
    p: PristupZgradama,
  ) {
    if (glasanja.length === 0) {
      return [];
    }
    const ids = glasanja.map((g) => g.id);
    const zgrade = [...new Set(glasanja.map((g) => g.zgrada.id))];

    const [poOpciji, moji, stanari] = await Promise.all([
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
      // Pravo glasa ima svako ko ima stan u zgradi (vlasnik i ukucanin)
      this.stanarStanaRepository
        .createQueryBuilder('veza')
        .innerJoin('veza.stan', 'stan')
        .select('stan.zgradaId', 'zgradaId')
        .addSelect('COUNT(DISTINCT veza.korisnikId)::int', 'broj')
        .where('stan.zgradaId IN (:...zgrade)', { zgrade })
        .groupBy('stan.zgradaId')
        .getRawMany<{ zgradaId: number; broj: number }>(),
    ]);

    const brojPoOpciji = new Map(poOpciji.map((r) => [r.opcijaId, r.broj]));
    const mojGlasPoAnketi = new Map(
      moji.map((glas) => [glas.glasanje.id, glas.opcija.id]),
    );
    const stanaraPoZgradi = new Map(stanari.map((r) => [r.zgradaId, r.broj]));
    const sada = new Date();

    return glasanja.map((glasanje) => {
      const zgradaId = glasanje.zgrada.id;
      const mojGlas = mojGlasPoAnketi.get(glasanje.id) ?? null;
      const zavrseno = glasanje.rok <= sada;
      const upravlja = sadrzi(p.upravlja, zgradaId);
      // Stanar vidi rezultate tek kad glasa, da ga tuđi glasovi ne bi usmerili
      const vidiRezultate = upravlja || zavrseno || mojGlas !== null;
      const brojevi = glasanje.opcije.map((o) => brojPoOpciji.get(o.id) ?? 0);

      return Object.assign(glasanje, {
        opcije: glasanje.opcije.map((opcija, i) => ({
          id: opcija.id,
          tekst: opcija.tekst,
          brojGlasova: vidiRezultate ? brojevi[i] : null,
        })),
        mojGlas,
        brojGlasaca: brojevi.reduce((zbir, broj) => zbir + broj, 0),
        brojStanara: stanaraPoZgradi.get(zgradaId) ?? 0,
        zavrseno,
        smeDaGlasa: !zavrseno && p.stanuje.includes(zgradaId),
        smeDaZatvori: !zavrseno && upravlja,
        smeDaObrise: upravlja,
      });
    });
  }
}
