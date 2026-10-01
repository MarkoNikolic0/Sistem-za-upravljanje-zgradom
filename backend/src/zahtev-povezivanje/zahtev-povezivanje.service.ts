import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ZahtevPovezivanje } from './zahtev-povezivanje.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { CreateZahtevDto } from './dto/create-zahtev.dto.js';
import { StatusZahteva } from '../shared/enums/status-zahteva.enum.js';
import { ResponseZahtevDto } from './dto/response-zahtev.dto.js';

@Injectable()
export class ZahtevPovezivanjeService {
  constructor(
    @InjectRepository(ZahtevPovezivanje)
    private zahtevRepository: Repository<ZahtevPovezivanje>,
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    private dataSource: DataSource,
  ) {}

  async create(korisnikId: number, dto: CreateZahtevDto) {
    const stan = await this.stanRepository.findOne({
      where: { id: dto.stanId },
    });
    if (!stan) {
      throw new NotFoundException(`Stan sa id-jem ${dto.stanId} ne postoji!`);
    }

    const vecPovezan = await this.stanarStanaRepository.exists({
      where: { korisnik: { id: korisnikId }, stan: { id: dto.stanId } },
    });
    if (vecPovezan) {
      throw new ConflictException('Već ste povezani sa ovim stanom!');
    }

    const imaNaCekanju = await this.zahtevRepository.exists({
      where: {
        korisnik: { id: korisnikId },
        stan: { id: dto.stanId },
        status: StatusZahteva.NA_CEKANJU,
      },
    });
    if (imaNaCekanju) {
      throw new ConflictException('Već imate zahtev na čekanju za ovaj stan!');
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
    if (zahtev.status !== StatusZahteva.NA_CEKANJU) {
      throw new BadRequestException('Zahtev je već obradjen!');
    }

    return await this.dataSource.transaction(async (manager) => {
      zahtev.status = dto.status;
      const obradjenZahtev = await manager.save(zahtev);

      if (dto.status === StatusZahteva.PRIHVACEN) {
        const veza = manager.create(StanarStana, {
          korisnik: zahtev.korisnik,
          stan: zahtev.stan,
          vlasnik: dto.vlasnik ?? false,
        });
        await manager.save(veza);
      }

      return obradjenZahtev;
    });
  }
}
