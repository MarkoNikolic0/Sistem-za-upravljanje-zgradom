import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, LessThanOrEqual, Repository, DataSource } from 'typeorm';
import { Oglas } from './oglas.entity.js';
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
import { type PristupZgradama, sadrzi } from '../korisnik/pristup-zgradama.js';
import { OglasPravaService, istekao } from './oglas-prava.service.js';
import { GlasanjeService } from '../glasanje/glasanje.service.js';
import { jeDupliUnos } from '../shared/greske-baze.js';
import { greskaPolja } from '../shared/greske-validacije.js';

const KRAJ_NOVOG_ROKA = `(date_trunc('day', now() AT TIME ZONE '${VREMENSKA_ZONA}')
  + interval '${DANA_VAZENJA + 1} days' - interval '1 millisecond') AT TIME ZONE '${VREMENSKA_ZONA}'`;

@Injectable()
export class OglasService {
  constructor(
    @InjectRepository(Oglas) private oglasRepository: Repository<Oglas>,
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
    private korisnikService: KorisnikService,
    private prilogService: PrilogOglasaService,
    private glasanjeService: GlasanjeService,
    private dataSource: DataSource,
    private prava: OglasPravaService,
  ) {}

  async findAll(
    korisnikId: number,
    uloga: Uloga,
    upit: OglasUpitDto,
  ): Promise<Stranica<Oglas>> {
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    const uslovi = this.prava.usloviVidljivosti(korisnikId, p, upit);
    if (uslovi.length === 0) {
      return { stavke: [], ukupno: 0 };
    }

    const [stavke, ukupno] = await this.oglasRepository.findAndCount({
      where: uslovi,
      relations: { zgrada: true, autor: true, prilozi: true },
      order: {
        zakaceno: 'DESC',
        datumKreiranja: 'DESC',
        id: 'DESC',
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
    const { oglas, p } = await this.prava.findDostupan(id, korisnikId, uloga);
    return this.saPravima(oglas, korisnikId, p);
  }

  async create(korisnikId: number, uloga: Uloga, dto: CreateOglasDto) {
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
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
    this.prava.proveriVrstu(dto.vrsta, p, dto.zgradaId);
    if (dto.glasanjeId !== undefined) {
      if (dto.vrsta !== VrstaOglasa.OBAVESTENJE) {
        throw greskaPolja('vrsta', 'Odluka se objavljuje kao obaveštenje.');
      }
      await this.glasanjeService.proveriObjavu(dto.glasanjeId, dto.zgradaId);
    }

    try {
      return await this.oglasRepository.save(
        this.oglasRepository.create({
          naslov: dto.naslov,
          tekst: dto.tekst,
          vrsta: dto.vrsta,
          vazno: dto.vazno,
          vaziDo: dto.vaziDo,
          zgrada: { id: dto.zgradaId },
          autor: { id: korisnikId },
          glasanje:
            dto.glasanjeId === undefined ? null : { id: dto.glasanjeId },
        }),
      );
    } catch (greska) {
      if (jeDupliUnos(greska)) {
        throw new ConflictException('Odluka je već objavljena.');
      }
      throw greska;
    }
  }

  async update(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: UpdateOglasDto,
  ) {
    const { oglas, p } = await this.prava.findZaIzmenu(id, korisnikId, uloga);
    if (dto.vrsta) {
      this.prava.proveriVrstu(dto.vrsta, p, oglas.zgrada.id);
    }
    if (
      dto.vrsta &&
      dto.vrsta !== VrstaOglasa.OBAVESTENJE &&
      (await this.oglasRepository.existsBy({ id, glasanje: Not(IsNull()) }))
    ) {
      throw greskaPolja('vrsta', 'Objava odluke ostaje obaveštenje.');
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
    const { oglas } = await this.prava.findDostupan(id, korisnikId, uloga);
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
    const { oglas } = await this.prava.findZaIzmenu(id, korisnikId, uloga);
    this.proveriDaNijeSakriven(oglas);
    return this.prilogService.dodaj(oglas.id, fajl);
  }

  async obrisiPrilog(
    id: number,
    prilogId: number,
    korisnikId: number,
    uloga: Uloga,
  ) {
    const { oglas } = await this.prava.findZaIzmenu(id, korisnikId, uloga);
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
    const { oglas, p } = await this.prava.findDostupan(id, korisnikId, uloga);
    if (!this.prava.smeDaSakrije(oglas, korisnikId, p)) {
      throw new ForbiddenException(
        'Tuđ oglas može da sakrije samo upravnik zgrade.',
      );
    }

    // Sakrivena objava više ne važi, pa upravnik odluku može da objavi ponovo
    const izmene = {
      datumSakrivanja: new Date(),
      razlogSakrivanja: dto.razlog,
      glasanje: null,
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
    const { oglas, p } = await this.prava.findDostupan(id, korisnikId, uloga);
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

  private proveriDaNijeSakriven(oglas: Oglas) {
    if (oglas.datumSakrivanja !== null) {
      throw new ConflictException(PORUKA_SAKRIVEN);
    }
  }

  private async saPravima(
    oglas: Oglas,
    korisnikId: number,
    p: PristupZgradama,
  ) {
    const autor = oglas.autor.id === korisnikId;
    const aktivan = oglas.datumSakrivanja === null;
    const isteklo = istekao(oglas);
    return Object.assign(oglas, {
      prilozi: await this.prilogService.saLinkovima(
        oglas.prilozi.toSorted((a, b) => a.id - b.id),
      ),
      smeDaMenja: autor && aktivan,
      smeDaObrise: autor,
      smeDaSakrije: aktivan && this.prava.smeDaSakrije(oglas, korisnikId, p),
      isteklo,
      smeDaObnovi: autor && aktivan && isteklo,
    });
  }
}
