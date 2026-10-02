import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Stan } from './stan.entity.js';
import { Repository } from 'typeorm';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { CreateStanDto } from './dto/create-stan.dto.js';
import { UpdateStanDto } from './dto/update-stan.dto.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { Kvar } from '../kvar/kvar.entity.js';
import { ZahtevPovezivanje } from '../zahtev-povezivanje/zahtev-povezivanje.entity.js';

@Injectable()
export class StanService {
  constructor(
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    @InjectRepository(Kvar) private kvarRepository: Repository<Kvar>,
    @InjectRepository(ZahtevPovezivanje)
    private zahtevRepository: Repository<ZahtevPovezivanje>,
    private korisnikService: KorisnikService,
  ) {}

  async create(korisnikId: number, uloga: Uloga, dto: CreateStanDto) {
    await this.proveriZgradu(korisnikId, uloga, dto.zgradaId);

    const zgrada = await this.zgradaRepository.findOne({
      where: { id: dto.zgradaId },
    });
    if (!zgrada) {
      throw new NotFoundException(
        `Zgrada sa id-jem ${dto.zgradaId} ne postoji!`,
      );
    }

    const stan = this.stanRepository.create({
      broj: dto.broj,
      sprat: dto.sprat,
      kvadratura: dto.kvadratura,
      zgrada,
    });
    return await this.stanRepository.save(stan);
  }

  async findAll() {
    return await this.stanRepository.find({ relations: { zgrada: true } });
  }

  async findByZgrada(zgradaId: number) {
    return await this.stanRepository.find({
      where: { zgrada: { id: zgradaId } },
    });
  }

  async findOne(stanId: number) {
    const stan = await this.stanRepository.findOne({
      where: { id: stanId },
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

    if (dto.zgradaId && dto.zgradaId !== stan.zgrada.id) {
      if (uloga !== Uloga.ADMIN) {
        throw new ForbiddenException(
          'Samo admin može premestiti stan u drugu zgradu!',
        );
      }
      const zgrada = await this.zgradaRepository.findOne({
        where: { id: dto.zgradaId },
      });
      if (!zgrada) {
        throw new NotFoundException(
          `Zgrada sa id-jem ${dto.zgradaId} ne postoji!`,
        );
      }
      stan.zgrada = zgrada;
    }

    Object.assign(stan, {
      broj: dto.broj ?? stan.broj,
      sprat: dto.sprat ?? stan.sprat,
      kvadratura: dto.kvadratura ?? stan.kvadratura,
    });
    return await this.stanRepository.save(stan);
  }

  async remove(id: number, korisnikId: number, uloga: Uloga) {
    const stan = await this.findOne(id);
    await this.proveriZgradu(korisnikId, uloga, stan.zgrada.id);

    const [stanari, kvarovi, zahtevi] = await Promise.all([
      this.stanarStanaRepository.count({ where: { stan: { id } } }),
      this.kvarRepository.count({ where: { stan: { id } } }),
      this.zahtevRepository.count({ where: { stan: { id } } }),
    ]);
    if (stanari + kvarovi + zahtevi > 0) {
      throw new ConflictException(
        `Stan se ne može obrisati jer ima: stanara ${stanari}, kvarova ${kvarovi}, zahteva za povezivanje ${zahtevi}.`,
      );
    }

    return await this.stanRepository.remove(stan);
  }

  private async proveriZgradu(
    korisnikId: number,
    uloga: Uloga,
    zgradaId: number,
  ) {
    if (uloga === Uloga.ADMIN) {
      return;
    }
    const zgradaUpravnika =
      await this.korisnikService.zgradaUpravnika(korisnikId);
    if (zgradaUpravnika !== zgradaId) {
      throw new ForbiddenException(
        'Možete upravljati samo stanovima svoje zgrade!',
      );
    }
  }
}
