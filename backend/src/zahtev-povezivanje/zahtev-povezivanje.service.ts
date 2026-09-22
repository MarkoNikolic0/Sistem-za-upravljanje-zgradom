import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ZahtevPovezivanje } from './zahtev-povezivanje.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { CreateZahtevDto } from './dto/create-zahtev.dto.js';
import { StatusZahteva } from '../shared/enums/status-zahteva.enum.js';
import { ResponseZahtevDto } from './dto/response-zahtev.dto.js';

@Injectable()
export class ZahtevPovezivanjeService {
  constructor(
    @InjectRepository(ZahtevPovezivanje)
    private zahtevRepository: Repository<ZahtevPovezivanje>,
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
  ) {}

  async create(korisnikId: number, dto: CreateZahtevDto) {
    const stan = await this.stanRepository.findOne({
      where: { id: dto.stanId },
    });
    if (!stan) {
      throw new NotFoundException(`Stan sa id-jem ${dto.stanId} ne postoji!`);
    }

    const postojeciAktivan = await this.zahtevRepository.findOne({
      where: {
        korisnik: { id: korisnikId },
        status: In([StatusZahteva.NA_CEKANJU, StatusZahteva.PRIHVACEN]),
      },
    });
    if (postojeciAktivan) {
      throw new BadRequestException(
        'Vec imate aktivan zahtev ili ste povezani sa stanom!',
      );
    }

    const zahtev = this.zahtevRepository.create({
      korisnik: { id: korisnikId } as Korisnik,
      stan,
    });

    return await this.zahtevRepository.save(zahtev);
  }

  async findAllNaCekanju() {
    return await this.zahtevRepository.find({
      where: {
        status: StatusZahteva.NA_CEKANJU,
      },
      relations: { korisnik: true, stan: true },
    });
  }

  async findAll() {
    return await this.zahtevRepository.find();
  }

  async zahtevResponse(zahtevId: number, dto: ResponseZahtevDto) {
    const zahtev = await this.zahtevRepository.findOne({
      where: { id: zahtevId },
      relations: { korisnik: true, stan: true },
    });
    if (!zahtev) {
      throw new NotFoundException(`Zahtev sa id-jem ${zahtevId} ne postoji!`);
    }

    zahtev.status = dto.status;
    const obradjenZahtev = await this.zahtevRepository.save(zahtev);
    if (dto.status === StatusZahteva.PRIHVACEN) {
      const korisnik = await this.korisnikRepository.findOne({
        where: { id: zahtev.korisnik.id },
      });
      if (korisnik) {
        korisnik.stan = zahtev.stan;
        await this.korisnikRepository.save(korisnik);
      }
    }

    return obradjenZahtev;
  }
}
