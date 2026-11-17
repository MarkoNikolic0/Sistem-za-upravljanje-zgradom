import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Stan } from './stan.entity.js';
import { In, Repository } from 'typeorm';
import { AKTIVNA_ZGRADA, proveriAktivnu } from '../zgrada/aktivna-zgrada.js';
import { CreateStanDto, PodaciStanaDto } from './dto/create-stan.dto.js';
import { UpdateStanDto } from './dto/update-stan.dto.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { sadrzi } from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { Kvar } from '../kvar/kvar.entity.js';
import { ZahtevPovezivanje } from '../zahtev-povezivanje/zahtev-povezivanje.entity.js';
import { Glas } from '../glasanje/glas.entity.js';
import { promeniBrojStanovaOdluka } from '../glasanje/stanovi-odluka.js';
import { PrisutanStan } from '../sastanak/prisutan-stan.entity.js';
import { poRedosleduStanova } from './redosled-stanova.js';
import { CreateStanoviDto } from './dto/create-stanovi.dto.js';
import { jeDupliUnos } from '../shared/greske-baze.js';

@Injectable()
export class StanService {
  constructor(
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    private korisnikService: KorisnikService,
  ) {}

  async create(korisnikId: number, uloga: Uloga, dto: CreateStanDto) {
    const { zgradaId, ...podaci } = dto;
    const [stan] = await this.sacuvajNove(korisnikId, uloga, zgradaId, [
      podaci,
    ]);
    return stan;
  }

  async createGrupno(korisnikId: number, uloga: Uloga, dto: CreateStanoviDto) {
    return await this.sacuvajNove(korisnikId, uloga, dto.zgradaId, dto.stanovi);
  }

  async findAll() {
    return await this.stanRepository.find({
      where: { zgrada: AKTIVNA_ZGRADA },
      relations: { zgrada: true },
    });
  }

  async findByZgrada(zgradaId: number) {
    const stanovi = await this.stanRepository.find({
      where: { zgrada: { id: zgradaId, ...AKTIVNA_ZGRADA } },
    });
    return stanovi.sort(poRedosleduStanova);
  }

  async findOne(stanId: number) {
    const stan = await this.stanRepository.findOne({
      where: { id: stanId, zgrada: AKTIVNA_ZGRADA },
      relations: { zgrada: true },
    });
    if (!stan) {
      throw new NotFoundException(`Stan sa id-jem ${stanId} ne postoji!`);
    }
    return stan;
  }

  async update(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: UpdateStanDto,
  ) {
    const stan = await this.findOne(id);
    await this.proveriZgradu(korisnikId, uloga, stan.zgrada.id);

    Object.assign(stan, {
      broj: dto.broj ?? stan.broj,
      sprat: dto.sprat ?? stan.sprat,
      kvadratura: dto.kvadratura ?? stan.kvadratura,
    });
    try {
      return await this.stanRepository.save(stan);
    } catch (greska) {
      if (jeDupliUnos(greska)) {
        throw new ConflictException(
          `Stan broj ${stan.broj} već postoji u ovoj zgradi.`,
        );
      }
      throw greska;
    }
  }

  async remove(id: number, korisnikId: number, uloga: Uloga) {
    const stan = await this.findOne(id);
    await this.proveriZgradu(korisnikId, uloga, stan.zgrada.id);

    return await this.stanRepository.manager.transaction(async (manager) => {
      await proveriAktivnu(manager, stan.zgrada.id, 'pessimistic_write');
      const zakljucan = await manager.findOne(Stan, {
        where: { id },
        select: { id: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!zakljucan) {
        throw new NotFoundException(`Stan sa id-jem ${id} ne postoji!`);
      }
      const uStanu = { where: { stan: { id } } };
      const [stanari, kvarovi, zahtevi, glasovi, prisustva] = await Promise.all(
        [
          manager.count(StanarStana, uStanu),
          manager.count(Kvar, uStanu),
          manager.count(ZahtevPovezivanje, uStanu),
          manager.count(Glas, uStanu),
          manager.count(PrisutanStan, uStanu),
        ],
      );
      if (stanari + kvarovi + zahtevi + glasovi + prisustva > 0) {
        throw new ConflictException(
          `Stan se ne može obrisati jer ima: stanara ${stanari}, kvarova ${kvarovi}, zahteva za povezivanje ${zahtevi}, glasova u odlukama ${glasovi}, prisustva na skupštinama ${prisustva}.`,
        );
      }
      const obrisan = await manager.remove(stan);
      await promeniBrojStanovaOdluka(manager, stan.zgrada.id, -1);
      return obrisan;
    });
  }

  private async sacuvajNove(
    korisnikId: number,
    uloga: Uloga,
    zgradaId: number,
    podaci: PodaciStanaDto[],
  ) {
    await this.proveriZgradu(korisnikId, uloga, zgradaId);
    await proveriAktivnu(this.stanRepository.manager, zgradaId);

    const brojevi = podaci.map((p) => p.broj);
    const ponovljeni = brojevi.filter((b, i) => brojevi.indexOf(b) !== i);
    if (ponovljeni.length > 0) {
      throw new BadRequestException(
        `Broj stana se ponavlja: ${[...new Set(ponovljeni)].join(', ')}.`,
      );
    }
    const postojeci = await this.stanRepository.find({
      where: { zgrada: { id: zgradaId }, broj: In(brojevi) },
      select: { id: true, broj: true },
    });
    if (postojeci.length > 0) {
      throw new ConflictException(
        `U ovoj zgradi već postoji stan broj: ${postojeci
          .map((p) => p.broj)
          .join(', ')}.`,
      );
    }

    const stanovi = podaci.map(({ broj, sprat, kvadratura }) =>
      this.stanRepository.create({
        broj,
        sprat,
        kvadratura,
        zgrada: { id: zgradaId },
      }),
    );
    try {
      return await this.stanRepository.manager.transaction(async (manager) => {
        await proveriAktivnu(manager, zgradaId, 'pessimistic_write');
        const sacuvani = await manager.save(stanovi);
        await promeniBrojStanovaOdluka(manager, zgradaId, sacuvani.length);
        return sacuvani;
      });
    } catch (greska) {
      if (jeDupliUnos(greska)) {
        throw new ConflictException(
          'Neko je u međuvremenu dodao stan sa istim brojem. Osveži stranicu.',
        );
      }
      throw greska;
    }
  }

  private async proveriZgradu(
    korisnikId: number,
    uloga: Uloga,
    zgradaId: number,
  ) {
    if (uloga === Uloga.ADMIN) {
      return;
    }
    const zgrade = await this.korisnikService.zgradeUpravnika(korisnikId);
    if (!sadrzi(zgrade, zgradaId)) {
      throw new ForbiddenException(
        'Možete upravljati samo stanovima svoje zgrade!',
      );
    }
  }
}
