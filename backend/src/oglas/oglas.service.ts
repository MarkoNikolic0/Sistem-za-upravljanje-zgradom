import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  IsNull,
  Not,
  LessThanOrEqual,
  Repository,
  DataSource,
  EntityManager,
  FindOptionsWhere,
} from 'typeorm';
import { Oglas } from './oglas.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { VrstaOglasa } from '../shared/enums/vrsta-oglasa.enum.js';
import { Stranica, stranicenje } from '../shared/stranicenje.js';
import { CreateOglasDto } from './dto/create-oglas.dto.js';
import { UpdateOglasDto } from './dto/update-oglas.dto.js';
import { SakrijOglasDto } from './dto/sakrij-oglas.dto.js';
import { OglasUpitDto } from './dto/oglas-upit.dto.js';
import { DANA_VAZENJA, PORUKA_SAKRIVEN, istekao } from './oglas.constants.js';
import { VREMENSKA_ZONA } from '../shared/vreme.js';
import { PrilogOglasaService } from './prilog-oglasa.service.js';
import { PrilogOglasa } from './prilog-oglasa.entity.js';
import { type PristupZgradama, sadrzi } from '../korisnik/pristup-zgradama.js';
import { proveriAktivnu } from '../zgrada/aktivna-zgrada.js';
import { OglasPravaService } from './oglas-prava.service.js';
import { GlasanjeService } from '../glasanje/glasanje.service.js';
import { jeDupliUnos } from '../shared/greske-baze.js';
import { greskaPolja } from '../shared/greske-validacije.js';
import { NotifikacijaService } from '../notifikacija/notifikacija.service.js';
import { TipNotifikacije } from '../notifikacija/notifikacija.entity.js';
import {
  stanariZgrade,
  upravnikZgrade,
  vidiZgradu,
} from '../notifikacija/primaoci.js';
import { PromeneService } from '../notifikacija/promene.service.js';
import { NotifikacijaGateway } from '../notifikacija/notifikacija.gateway.js';
import { nePostoji } from '../shared/ne-postoji.js';

function jeVaznoObavestenje(oglas: { vrsta?: VrstaOglasa; vazno?: boolean }) {
  return oglas.vrsta === VrstaOglasa.OBAVESTENJE && oglas.vazno === true;
}

const KRAJ_NOVOG_ROKA = `(date_trunc('day', now() AT TIME ZONE '${VREMENSKA_ZONA}')
  + interval '${DANA_VAZENJA + 1} days' - interval '1 millisecond') AT TIME ZONE '${VREMENSKA_ZONA}'`;

@Injectable()
export class OglasService {
  private readonly logger = new Logger(OglasService.name);

  constructor(
    @InjectRepository(Oglas) private oglasRepository: Repository<Oglas>,
    private korisnikService: KorisnikService,
    private prilogService: PrilogOglasaService,
    private glasanjeService: GlasanjeService,
    private dataSource: DataSource,
    private prava: OglasPravaService,
    private notifikacije: NotifikacijaService,
    private gateway: NotifikacijaGateway,
    private promene: PromeneService,
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
    await proveriAktivnu(this.dataSource.manager, dto.zgradaId);
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    if (!sadrzi(p.zgrade, dto.zgradaId)) {
      throw new ForbiddenException(
        'Oglas možeš da objaviš samo u zgradi u kojoj stanuješ.',
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
      const sacuvan = await this.dataSource.transaction(async (manager) => {
        await proveriAktivnu(manager, dto.zgradaId, 'pessimistic_read');
        const sacuvan = await manager.save(
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
        if (jeVaznoObavestenje(dto)) {
          await this.obavestiOVaznom(
            manager,
            dto.zgradaId,
            dto.naslov,
            korisnikId,
          );
        }
        return sacuvan;
      });
      void this.javiNovOglas(dto.zgradaId, korisnikId);
      return sacuvan;
    } catch (greska) {
      if (jeDupliUnos(greska)) {
        throw new ConflictException('Odluka je već objavljena.');
      }
      throw greska;
    }
  }

  private async obavestiOVaznom(
    manager: EntityManager,
    zgradaId: number,
    naslov: string,
    autorId: number,
  ) {
    await this.notifikacije.obavesti(
      manager,
      [
        ...(await stanariZgrade(manager, zgradaId)),
        ...(await upravnikZgrade(manager, zgradaId)),
      ],
      {
        tip: TipNotifikacije.VAZNO_OBAVESTENJE,
        tekst: `Važno obaveštenje: „${naslov}“.`,
        link: '/oglasi',
      },
      autorId,
    );
  }

  private async javiNovOglas(zgradaId: number, autorId: number) {
    try {
      const manager = this.dataSource.manager;
      const [stanari, upravnik] = await Promise.all([
        stanariZgrade(manager, zgradaId),
        upravnikZgrade(manager, zgradaId),
      ]);
      this.gateway.javiNovOglas(
        [...stanari, ...upravnik].filter((id) => id !== autorId),
      );
    } catch (greska) {
      this.logger.error('Signal za nov oglas nije poslat.', greska);
    }
  }

  async update(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: UpdateOglasDto,
  ) {
    const { oglas, p } = await this.prava.findZaAutora(
      id,
      korisnikId,
      uloga,
      'menja',
    );
    const novaVrsta =
      dto.vrsta !== undefined && dto.vrsta !== null && dto.vrsta !== oglas.vrsta
        ? dto.vrsta
        : null;
    if (novaVrsta) {
      this.prava.proveriVrstu(novaVrsta, p, oglas.zgrada.id);
    }
    if (
      novaVrsta &&
      novaVrsta !== VrstaOglasa.OBAVESTENJE &&
      (await this.oglasRepository.existsBy({ id, glasanje: Not(IsNull()) }))
    ) {
      throw greskaPolja('vrsta', 'Objava odluke ostaje obaveštenje.');
    }

    const izmene = {
      naslov: dto.naslov ?? oglas.naslov,
      tekst: dto.tekst ?? oglas.tekst,
      vrsta: dto.vrsta ?? oglas.vrsta,
      vazno: dto.vazno ?? oglas.vazno,
      vaziDo: dto.vaziDo === undefined ? oglas.vaziDo : dto.vaziDo,
    };
    const datumIzmene =
      izmene.naslov !== oglas.naslov ||
      izmene.tekst !== oglas.tekst ||
      izmene.vrsta !== oglas.vrsta
        ? { datumIzmene: new Date() }
        : {};

    await this.dataSource.transaction(async (manager) => {
      const trenutni = await manager.findOne(Oglas, {
        where: { id, datumSakrivanja: IsNull() },
        select: { id: true, vrsta: true, vazno: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!trenutni) {
        throw new ConflictException(PORUKA_SAKRIVEN);
      }
      await manager.update(Oglas, id, { ...izmene, ...datumIzmene });
      if (jeVaznoObavestenje(izmene) && !jeVaznoObavestenje(trenutni)) {
        await this.obavestiOVaznom(
          manager,
          oglas.zgrada.id,
          izmene.naslov,
          korisnikId,
        );
      }
    });
    this.javiPromenu(oglas, korisnikId);
    return this.saPravima(
      Object.assign(oglas, izmene, datumIzmene),
      korisnikId,
      p,
    );
  }

  async remove(id: number, korisnikId: number, uloga: Uloga) {
    const { oglas } = await this.prava.findZaBrisanje(id, korisnikId, uloga);
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
    this.javiPromenu(oglas, korisnikId);
    await this.prilogService.obrisiFajlove(prilozi);
  }

  async dodajPrilog(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    fajl: Express.Multer.File | undefined,
  ) {
    const { oglas } = await this.prava.findZaAutora(
      id,
      korisnikId,
      uloga,
      'menja',
    );
    this.proveriDaNijeSakriven(oglas);
    const prilog = await this.prilogService.dodaj(
      oglas.id,
      oglas.prilozi.length,
      fajl,
    );
    this.javiPromenu(oglas, korisnikId);
    return prilog;
  }

  async obrisiPrilog(
    id: number,
    prilogId: number,
    korisnikId: number,
    uloga: Uloga,
  ) {
    const { oglas } = await this.prava.findZaAutora(
      id,
      korisnikId,
      uloga,
      'menja',
    );
    const prilog = oglas.prilozi.find((p) => p.id === prilogId);
    if (!prilog) {
      throw nePostoji('Prilog', prilogId);
    }
    this.proveriDaNijeSakriven(oglas);
    await this.prilogService.obrisi(prilog);
    this.javiPromenu(oglas, korisnikId);
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

    const izmene = {
      datumSakrivanja: new Date(),
      razlogSakrivanja: dto.razlog,
      glasanje: null,
    };
    await this.dataSource.transaction(async (manager) => {
      const rezultat = await manager.update(
        Oglas,
        { id, datumSakrivanja: IsNull() },
        izmene,
      );
      if (rezultat.affected === 0) {
        throw new ConflictException('Oglas je već sakriven.');
      }
      await this.notifikacije.obavesti(
        manager,
        [oglas.autor.id],
        {
          tip: TipNotifikacije.OGLAS_SAKRIVEN,
          tekst: `Tvoj oglas „${oglas.naslov}“ je sakriven. Razlog: ${dto.razlog}`,
          link: '/oglasi',
        },
        korisnikId,
      );
    });
    this.javiPromenu(oglas, korisnikId);
    return this.saPravima(Object.assign(oglas, izmene), korisnikId, p);
  }

  async obrisiLicneOglase(manager: EntityManager, autorId: number) {
    const gde = {
      autor: { id: autorId },
      vrsta: Not(VrstaOglasa.OBAVESTENJE),
    };
    const prilozi = await manager.find(PrilogOglasa, {
      where: { oglas: gde },
      select: { id: true, kljuc: true, kljucSlicice: true },
    });
    await manager.delete(Oglas, gde);
    return prilozi;
  }

  obrisiFajlovePriloga(prilozi: PrilogOglasa[]) {
    return this.prilogService.obrisiFajlove(prilozi);
  }

  async sakrijOglase(
    manager: EntityManager,
    gde: FindOptionsWhere<Oglas>,
    razlog: string,
  ) {
    await manager.update(
      Oglas,
      {
        ...gde,
        vrsta: Not(VrstaOglasa.OBAVESTENJE),
        datumSakrivanja: IsNull(),
      },
      { datumSakrivanja: new Date(), razlogSakrivanja: razlog },
    );
  }

  async obnovi(id: number, korisnikId: number, uloga: Uloga) {
    const { oglas, p } = await this.prava.findZaAutora(
      id,
      korisnikId,
      uloga,
      'obnovi',
    );
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
    this.javiPromenu(oglas, korisnikId);
    return this.saPravima(Object.assign(oglas, izmene), korisnikId, p);
  }

  private javiPromenu(oglas: Oglas, korisnikId: number) {
    this.promene.javi(
      { vrsta: 'oglas', id: oglas.id },
      (manager) => vidiZgradu(manager, oglas.zgrada.id),
      [korisnikId],
    );
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
      smeDaObrise: this.prava.smeDaObrise(oglas, korisnikId, p),
      smeDaSakrije: aktivan && this.prava.smeDaSakrije(oglas, korisnikId, p),
      isteklo,
      smeDaObnovi: autor && aktivan && isteklo,
    });
  }
}
