import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { Glasanje } from './glasanje.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { Oglas } from '../oglas/oglas.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { sadrzi } from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import {
  StanjeGlasanja,
  VrstaGlasanja,
} from '../shared/enums/glasanje.enums.js';
import { Stranica, stranicenje } from '../shared/stranicenje.js';
import { greskaPolja } from '../shared/greske-validacije.js';
import { CreateGlasanjeDto } from './dto/create-glasanje.dto.js';
import { GlasanjeUpitDto } from './dto/glasanje-upit.dto.js';
import { ODGOVORI_ODLUKE } from './ishod-odluke.js';
import { GlasanjePravaService } from './glasanje-prava.service.js';
import { GlasanjeRezultatiService } from './glasanje-rezultati.service.js';
import { PORUKA_ZAVRSENA } from './glasanje.constants.js';

@Injectable()
export class GlasanjeService {
  constructor(
    @InjectRepository(Glasanje)
    private glasanjeRepository: Repository<Glasanje>,
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
    @InjectRepository(Oglas) private oglasRepository: Repository<Oglas>,
    private korisnikService: KorisnikService,
    private prava: GlasanjePravaService,
    private rezultati: GlasanjeRezultatiService,
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

    const uslovi = this.prava
      .usloviVidljivosti(p, upit.zgradaId)
      .map((uslov) => ({ ...uslov, rok }));
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
      stavke: await this.rezultati.saRezultatima(stavke, korisnikId, p, sada),
      ukupno,
    };
  }

  // Lak spisak odluka zgrade za izbor uz tačku dnevnog reda, bez rezultata
  async odlukeZgrade(korisnikId: number, uloga: Uloga, zgradaId: number) {
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    if (!sadrzi(p.upravlja, zgradaId)) {
      throw new ForbiddenException('Odluke za sastanak bira upravnik zgrade.');
    }
    const sada = new Date();
    const odluke = await this.glasanjeRepository.find({
      select: { id: true, pitanje: true, rok: true },
      where: { vrsta: VrstaGlasanja.ODLUKA, zgrada: { id: zgradaId } },
      order: { rok: 'DESC', id: 'DESC' },
    });
    return odluke.map(({ id, pitanje, rok }) => ({
      id,
      pitanje,
      rok,
      zavrseno: rok <= sada,
    }));
  }

  async findOne(id: number, korisnikId: number, uloga: Uloga) {
    const { glasanje, p } = await this.prava.findDostupno(
      id,
      korisnikId,
      uloga,
    );
    return this.rezultati.jednoSaRezultatima(glasanje, korisnikId, p);
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
    return this.rezultati.jedno(id, korisnikId, p);
  }

  async zatvori(id: number, korisnikId: number, uloga: Uloga) {
    const { glasanje, p } = await this.prava.findZaUpravljanje(
      id,
      korisnikId,
      uloga,
    );
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
    return this.rezultati.jedno(id, korisnikId, p);
  }

  async remove(id: number, korisnikId: number, uloga: Uloga) {
    await this.prava.findZaUpravljanje(id, korisnikId, uloga);
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
}
