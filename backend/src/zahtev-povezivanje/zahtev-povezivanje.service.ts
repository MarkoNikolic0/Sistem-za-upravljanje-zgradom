import {
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
import { Stranica, stranicenje } from '../shared/stranicenje.js';
import { ZahtevUpitDto } from './dto/zahtev-upit.dto.js';

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

  async findZaObradu(
    korisnikId: number,
    uloga: Uloga,
    upit: ZahtevUpitDto,
  ): Promise<Stranica<ZahtevPovezivanje>> {
    const where: FindOptionsWhere<ZahtevPovezivanje> = upit.status
      ? { status: upit.status }
      : {};

    if (uloga !== Uloga.ADMIN) {
      const zgradaId = await this.korisnikService.zgradaUpravnika(korisnikId);
      if (zgradaId === null) {
        return { stavke: [], ukupno: 0 };
      }
      where.stan = { zgrada: { id: zgradaId } };
    }

    const [stavke, ukupno] = await this.zahtevRepository.findAndCount({
      where,
      relations: { korisnik: true, stan: { zgrada: true } },
      order: { datumPodnosenjaZahteva: 'DESC', id: 'DESC' },
      ...stranicenje(upit),
    });

    return { stavke, ukupno };
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

    return await this.dataSource.transaction(async (manager) => {
      const rezultat = await manager.update(
        ZahtevPovezivanje,
        { id: zahtevId, status: StatusZahteva.NA_CEKANJU },
        { status: dto.status },
      );
      if (rezultat.affected === 0) {
        throw new ConflictException('Zahtev je već obrađen.');
      }

      if (dto.status === StatusZahteva.PRIHVACEN) {
        const veza = manager.create(StanarStana, {
          korisnik: zahtev.korisnik,
          stan: zahtev.stan,
          vlasnik: dto.vlasnik ?? false,
        });
        await manager.save(veza);
      }

      zahtev.status = dto.status;
      return zahtev;
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
