import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { ZahtevPovezivanje } from './zahtev-povezivanje.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { CreateZahtevDto } from './dto/create-zahtev.dto.js';
import { StatusZahteva } from '../shared/enums/status-zahteva.enum.js';
import { ResponseZahtevDto } from './dto/response-zahtev.dto.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';

@Injectable()
export class ZahtevPovezivanjeService {
  constructor(
    @InjectRepository(ZahtevPovezivanje)
    private zahtevRepository: Repository<ZahtevPovezivanje>,
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    private dataSource: DataSource,
    private korisnikService: KorisnikService,
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

  async findAllNaCekanju(korisnikId: number, uloga: Uloga) {
    return await this.findVidljive(korisnikId, uloga, {
      status: StatusZahteva.NA_CEKANJU,
    });
  }

  async findAll(korisnikId: number, uloga: Uloga) {
    return await this.findVidljive(korisnikId, uloga, {});
  }

  private async findVidljive(
    korisnikId: number,
    uloga: Uloga,
    where: FindOptionsWhere<ZahtevPovezivanje>,
  ) {
    const relations = { korisnik: true, stan: { zgrada: true } };

    if (uloga === Uloga.ADMIN) {
      return await this.zahtevRepository.find({ where, relations });
    }

    const zgradaId = await this.korisnikService.zgradaUpravnika(korisnikId);
    if (zgradaId === null) {
      return [];
    }

    return await this.zahtevRepository.find({
      where: { ...where, stan: { zgrada: { id: zgradaId } } },
      relations,
    });
  }

  async zahtevResponse(
    zahtevId: number,
    korisnikId: number,
    uloga: Uloga,
    dto: ResponseZahtevDto,
  ) {
    const zahtev = await this.zahtevRepository.findOne({
      where: { id: zahtevId },
      relations: { korisnik: true, stan: { zgrada: true } },
    });
    if (!zahtev) {
      throw new NotFoundException(`Zahtev sa id-jem ${zahtevId} ne postoji!`);
    }

    if (uloga !== Uloga.ADMIN) {
      const zgradaId = await this.korisnikService.zgradaUpravnika(korisnikId);
      if (zahtev.stan.zgrada.id !== zgradaId) {
        throw new ForbiddenException(
          'Možete obrađivati samo zahteve za svoju zgradu!',
        );
      }
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

  async findMoji(korisnikId: number) {
    return await this.zahtevRepository.find({
      where: { korisnik: { id: korisnikId } },
      relations: { stan: { zgrada: true } },
      order: { datumPodnosenjaZahteva: 'DESC' },
    });
  }
}
