import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  Or,
  Repository,
  DataSource,
} from 'typeorm';
import { Oglas } from './oglas.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { VrstaOglasa } from '../shared/enums/vrsta-oglasa.enum.js';
import { Stranica, stranicenje } from '../shared/stranicenje.js';
import { CreateOglasDto } from './dto/create-oglas.dto.js';
import { UpdateOglasDto } from './dto/update-oglas.dto.js';
import { SakrijOglasDto } from './dto/sakrij-oglas.dto.js';
import { OglasUpitDto } from './dto/oglas-upit.dto.js';
import { DANA_VAZENJA, PORUKA_SAKRIVEN } from './oglas.constants.js';
import { VREMENSKA_ZONA } from '../shared/vreme.js';
import { PrilogOglasaService } from './prilog-oglasa.service.js';
import { PrilogOglasa } from './prilog-oglasa.entity.js';

const KRAJ_NOVOG_ROKA = `(date_trunc('day', now() AT TIME ZONE '${VREMENSKA_ZONA}')
  + interval '${DANA_VAZENJA + 1} days' - interval '1 millisecond') AT TIME ZONE '${VREMENSKA_ZONA}'`;

// null = sve zgrade (admin)
interface Pristup {
  zgrade: number[] | null;
  upravlja: number[] | null;
}

function sadrzi(zgrade: number[] | null, zgradaId: number) {
  return zgrade === null || zgrade.includes(zgradaId);
}

function istekao(oglas: Oglas, sada = new Date()) {
  return oglas.vaziDo !== null && oglas.vaziDo <= sada;
}

function samoZgrada(zgrade: number[] | null, zgradaId?: number) {
  if (zgradaId === undefined) {
    return zgrade;
  }
  return sadrzi(zgrade, zgradaId) ? [zgradaId] : [];
}

@Injectable()
export class OglasService {
  constructor(
    @InjectRepository(Oglas) private oglasRepository: Repository<Oglas>,
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
    private korisnikService: KorisnikService,
    private prilogService: PrilogOglasaService,
    private dataSource: DataSource,
  ) {}

  private async pristup(korisnikId: number, uloga: Uloga): Promise<Pristup> {
    if (uloga === Uloga.ADMIN) {
      return { zgrade: null, upravlja: null };
    }
    const veze = await this.stanarStanaRepository.find({
      where: { korisnik: { id: korisnikId } },
      relations: { stan: { zgrada: true } },
      select: { id: true, stan: { id: true, zgrada: { id: true } } },
    });
    const zgradaUpravnika =
      uloga === Uloga.UPRAVNIK
        ? await this.korisnikService.zgradaUpravnika(korisnikId)
        : null;
    const upravlja = zgradaUpravnika === null ? [] : [zgradaUpravnika];
    const zgrade = [
      ...new Set([...veze.map((v) => v.stan.zgrada.id), ...upravlja]),
    ];
    return { zgrade, upravlja };
  }

  async findAll(
    korisnikId: number,
    uloga: Uloga,
    upit: OglasUpitDto,
  ): Promise<Stranica<Oglas>> {
    const p = await this.pristup(korisnikId, uloga);
    const zgrade = samoZgrada(p.zgrade, upit.zgradaId);
    const upravlja = samoZgrada(p.upravlja, upit.zgradaId);
    if (zgrade?.length === 0) {
      return { stavke: [], ukupno: 0 };
    }

    const uZgradama = (ids: number[] | null): FindOptionsWhere<Oglas> => ({
      ...(ids === null ? {} : { zgrada: { id: In(ids) } }),
      ...(upit.vrsta ? { vrsta: upit.vrsta } : {}),
    });
    // Admin vidi sve; sakriven i istekao oglas od ostalih vide samo autor i upravnik zgrade.
    // Admin ima poseban uslov jer TypeORM prazan uslov {} izbaci iz OR niza.
    const uslovi: FindOptionsWhere<Oglas>[] =
      upravlja === null
        ? [uZgradama(zgrade)]
        : [
            {
              ...uZgradama(zgrade),
              datumSakrivanja: IsNull(),
              vaziDo: Or(IsNull(), MoreThan(new Date())),
            },
            { ...uZgradama(zgrade), autor: { id: korisnikId } },
            ...(upravlja.length > 0 ? [uZgradama(upravlja)] : []),
          ];

    const [stavke, ukupno] = await this.oglasRepository.findAndCount({
      where: uslovi,
      relations: { zgrada: true, autor: true, prilozi: true },
      order: {
        zakaceno: 'DESC',
        datumKreiranja: 'DESC',
        id: 'DESC',
        prilozi: { id: 'ASC' },
      },
      ...stranicenje(upit),
    });

    return {
      stavke: await Promise.all(
        stavke.map((oglas) => this.saPravima(oglas, korisnikId, p)),
      ),
      ukupno,
    };
  }

  async findDetalj(id: number, korisnikId: number, uloga: Uloga) {
    const { oglas, p } = await this.findDostupan(id, korisnikId, uloga);
    return this.saPravima(oglas, korisnikId, p);
  }

  async create(korisnikId: number, uloga: Uloga, dto: CreateOglasDto) {
    const p = await this.pristup(korisnikId, uloga);
    if (!sadrzi(p.zgrade, dto.zgradaId)) {
      throw new ForbiddenException(
        'Oglas možeš da objaviš samo u zgradi u kojoj stanuješ.',
      );
    }
    if (
      p.zgrade === null &&
      !(await this.zgradaRepository.existsBy({ id: dto.zgradaId }))
    ) {
      throw new NotFoundException(
        `Zgrada sa id-jem ${dto.zgradaId} ne postoji!`,
      );
    }
    this.proveriVrstu(dto.vrsta, p, dto.zgradaId);

    return await this.oglasRepository.save(
      this.oglasRepository.create({
        naslov: dto.naslov,
        tekst: dto.tekst,
        vrsta: dto.vrsta,
        vazno: dto.vazno,
        vaziDo: dto.vaziDo,
        zgrada: { id: dto.zgradaId },
        autor: { id: korisnikId },
      }),
    );
  }

  async update(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: UpdateOglasDto,
  ) {
    const { oglas, p } = await this.findZaIzmenu(id, korisnikId, uloga);
    if (dto.vrsta) {
      this.proveriVrstu(dto.vrsta, p, oglas.zgrada.id);
    }

    const izmene: Partial<Oglas> = {
      naslov: dto.naslov ?? oglas.naslov,
      tekst: dto.tekst ?? oglas.tekst,
      vrsta: dto.vrsta ?? oglas.vrsta,
      vazno: dto.vazno ?? oglas.vazno,
      vaziDo: dto.vaziDo === undefined ? oglas.vaziDo : dto.vaziDo,
    };
    if (
      izmene.naslov !== oglas.naslov ||
      izmene.tekst !== oglas.tekst ||
      izmene.vrsta !== oglas.vrsta
    ) {
      izmene.datumIzmene = new Date();
    }

    const rezultat = await this.oglasRepository.update(
      { id, datumSakrivanja: IsNull() },
      izmene,
    );
    if (rezultat.affected === 0) {
      throw new ConflictException(PORUKA_SAKRIVEN);
    }
    return this.saPravima(Object.assign(oglas, izmene), korisnikId, p);
  }

  async remove(id: number, korisnikId: number, uloga: Uloga) {
    const { oglas } = await this.findDostupan(id, korisnikId, uloga);
    if (oglas.autor.id !== korisnikId) {
      throw new ForbiddenException(
        'Oglas može da obriše samo onaj ko ga je objavio.',
      );
    }
    const prilozi = await this.dataSource.transaction(async (manager) => {
      await manager.findOne(Oglas, {
        where: { id },
        select: { id: true },
        lock: { mode: 'pessimistic_write' },
      });
      const prilozi = await manager.find(PrilogOglasa, {
        where: { oglas: { id } },
        select: { id: true, kljuc: true, kljucSlicice: true },
      });
      await manager.delete(Oglas, id);
      return prilozi;
    });
    await this.prilogService.obrisiFajlove(prilozi);
  }

  async dodajPrilog(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    fajl: Express.Multer.File | undefined,
  ) {
    const { oglas } = await this.findZaIzmenu(id, korisnikId, uloga);
    this.proveriDaNijeSakriven(oglas);
    return this.prilogService.dodaj(oglas.id, fajl);
  }

  async obrisiPrilog(
    id: number,
    prilogId: number,
    korisnikId: number,
    uloga: Uloga,
  ) {
    const { oglas } = await this.findZaIzmenu(id, korisnikId, uloga);
    const prilog = oglas.prilozi.find((p) => p.id === prilogId);
    if (!prilog) {
      throw new NotFoundException(`Prilog sa id-jem ${prilogId} ne postoji!`);
    }
    this.proveriDaNijeSakriven(oglas);
    await this.prilogService.obrisi(prilog);
  }

  async sakrij(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: SakrijOglasDto,
  ) {
    const { oglas, p } = await this.findDostupan(id, korisnikId, uloga);
    if (!this.smeDaSakrije(oglas, korisnikId, p)) {
      throw new ForbiddenException(
        'Tuđ oglas može da sakrije samo upravnik zgrade.',
      );
    }

    const izmene = {
      datumSakrivanja: new Date(),
      razlogSakrivanja: dto.razlog,
    };
    const rezultat = await this.oglasRepository.update(
      { id, datumSakrivanja: IsNull() },
      izmene,
    );
    if (rezultat.affected === 0) {
      throw new ConflictException('Oglas je već sakriven.');
    }
    return this.saPravima(Object.assign(oglas, izmene), korisnikId, p);
  }

  async obnovi(id: number, korisnikId: number, uloga: Uloga) {
    const { oglas, p } = await this.findDostupan(id, korisnikId, uloga);
    if (oglas.autor.id !== korisnikId) {
      throw new ForbiddenException(
        'Oglas može da obnovi samo onaj ko ga je objavio.',
      );
    }
    if (oglas.datumSakrivanja !== null) {
      throw new ConflictException(
        'Oglas je sakriven, pa ne može da se obnovi.',
      );
    }
    const sada = new Date();
    if (!istekao(oglas, sada)) {
      throw new ConflictException('Oglas još važi.');
    }

    const rezultat = await this.oglasRepository
      .createQueryBuilder()
      .update()
      .set({ vaziDo: () => KRAJ_NOVOG_ROKA })
      .where({ id, datumSakrivanja: IsNull(), vaziDo: LessThanOrEqual(sada) })
      .returning('"vaziDo"')
      .execute();
    if (rezultat.affected === 0) {
      throw new ConflictException(
        'Oglas je u međuvremenu obnovljen ili sakriven.',
      );
    }
    const izmene = {
      vaziDo: (rezultat.raw as Pick<Oglas, 'vaziDo'>[])[0].vaziDo,
    };
    return this.saPravima(Object.assign(oglas, izmene), korisnikId, p);
  }

  private async findDostupan(id: number, korisnikId: number, uloga: Uloga) {
    const oglas = await this.oglasRepository.findOne({
      where: { id },
      relations: { zgrada: true, autor: true, prilozi: true },
      order: { prilozi: { id: 'ASC' } },
    });
    if (!oglas) {
      throw new NotFoundException(`Oglas sa id-jem ${id} ne postoji!`);
    }
    const p = await this.pristup(korisnikId, uloga);
    const vidi =
      sadrzi(p.upravlja, oglas.zgrada.id) ||
      (sadrzi(p.zgrade, oglas.zgrada.id) &&
        ((oglas.datumSakrivanja === null && !istekao(oglas)) ||
          oglas.autor.id === korisnikId));
    if (!vidi) {
      throw new ForbiddenException('Nemate pristup ovom oglasu!');
    }
    return { oglas, p };
  }

  private async findZaIzmenu(id: number, korisnikId: number, uloga: Uloga) {
    const dostupan = await this.findDostupan(id, korisnikId, uloga);
    if (dostupan.oglas.autor.id !== korisnikId) {
      throw new ForbiddenException(
        'Oglas može da menja samo onaj ko ga je objavio.',
      );
    }
    return dostupan;
  }

  private proveriDaNijeSakriven(oglas: Oglas) {
    if (oglas.datumSakrivanja !== null) {
      throw new ConflictException(PORUKA_SAKRIVEN);
    }
  }

  private smeDaSakrije(oglas: Oglas, korisnikId: number, p: Pristup) {
    return oglas.autor.id !== korisnikId && sadrzi(p.upravlja, oglas.zgrada.id);
  }

  private async saPravima(oglas: Oglas, korisnikId: number, p: Pristup) {
    const autor = oglas.autor.id === korisnikId;
    const aktivan = oglas.datumSakrivanja === null;
    const isteklo = istekao(oglas);
    return Object.assign(oglas, {
      prilozi: await this.prilogService.saLinkovima(oglas.prilozi),
      smeDaMenja: autor && aktivan,
      smeDaObrise: autor,
      smeDaSakrije: aktivan && this.smeDaSakrije(oglas, korisnikId, p),
      isteklo,
      smeDaObnovi: autor && aktivan && isteklo,
    });
  }

  private proveriVrstu(vrsta: VrstaOglasa, p: Pristup, zgradaId: number) {
    if (vrsta === VrstaOglasa.OBAVESTENJE && !sadrzi(p.upravlja, zgradaId)) {
      throw new ForbiddenException('Obaveštenje objavljuje upravnik zgrade.');
    }
  }
}
