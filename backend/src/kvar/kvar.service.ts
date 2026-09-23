import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateKvarDto } from './dto/create-kvar.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Kvar } from './kvar.entity.js';
import { Repository } from 'typeorm';
import { Stan } from '../stan/stan.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import {
  KategorijaKvara,
  LokacijaTip,
  Prioritet,
  StatusKvara,
} from '../shared/enums/kvar.enums.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { PostaviPrioritetDto } from './dto/postavi-prioritet.dto.js';
import { DodeliServiseraDto } from './dto/dodeli-servisera.dto.js';
import { UpdateStatusKvarDto } from './dto/update-status-kvar.dto.js';

@Injectable()
export class KvarService {
  constructor(
    @InjectRepository(Kvar) private kvarRepository: Repository<Kvar>,
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
  ) {}

  async create(korisnikId: number, dto: CreateKvarDto) {
    const korisnik = await this.korisnikRepository.findOne({
      where: { id: korisnikId },
      relations: { zgrada: true, stan: true },
    });
    if (!korisnik) {
      throw new NotFoundException(
        `Korisnik sa id-jem ${korisnikId} ne postoji!`,
      );
    }
    if (!korisnik.zgrada) {
      throw new BadRequestException('Niste povezani ni sa jednom zgradom!');
    }
    if (dto.lokacijaTip === LokacijaTip.PRIVATNI_STAN && !korisnik.stan) {
      throw new BadRequestException(`Niste povezani ni sa jednim stanom!`);
    }

    const kvar = this.kvarRepository.create({
      naslov: dto.naslov,
      opis: dto.opis,
      kategorija: dto.kategorija,
      lokacijaTip: dto.lokacijaTip,
      prioritet: dto.prioritet ?? Prioritet.SREDNJE,
      stan:
        dto.lokacijaTip === LokacijaTip.PRIVATNI_STAN
          ? korisnik.stan!
          : undefined,
      zgrada: korisnik.zgrada,
      korisnik: korisnik,
    });

    return await this.kvarRepository.save(kvar);
  }

  async findAllZaKorisnika(
    korisnikId: number,
    uloga: Uloga,
    zgradaId?: number,
  ) {
    if (uloga === Uloga.UPRAVNIK || uloga === Uloga.ADMIN) {
      return await this.kvarRepository.find({
        where: zgradaId ? { zgrada: { id: zgradaId } } : {},
        relations: { zgrada: true, stan: true, korisnik: true, serviser: true },
      });
    }

    if (uloga === Uloga.SERVISER) {
      return this.kvarRepository.find({
        where: { serviser: { id: korisnikId } },
        relations: { zgrada: true, stan: true, korisnik: true },
        order: { datumPrijave: 'DESC' },
      });
    }

    const korisnik = await this.korisnikRepository.findOne({
      where: { id: korisnikId },
      relations: { zgrada: true },
    });
    if (!korisnik?.zgrada) {
      return [];
    }

    const sopstveni = await this.kvarRepository.find({
      where: { korisnik: { id: korisnikId } },
      relations: { zgrada: true, stan: true, serviser: true },
      order: { datumPrijave: 'DESC' },
    });

    const zajednicki = await this.kvarRepository.find({
      where: {
        zgrada: { id: korisnik.zgrada.id },
        lokacijaTip: LokacijaTip.ZAJEDNICKI_PROSTOR,
      },
      relations: { zgrada: true, korisnik: true, serviser: true },
      order: { datumPrijave: 'DESC' },
    });

    const spojeno = [
      ...sopstveni,
      ...zajednicki.filter((k) => k.korisnik.id !== korisnikId),
    ];
    return spojeno.sort(
      (a, b) => b.datumPrijave.getTime() - a.datumPrijave.getTime(),
    );
  }

  async findOne(id: number) {
    const kvar = await this.kvarRepository.findOne({
      where: { id },
      relations: { zgrada: true, stan: true, korisnik: true, serviser: true },
    });
    if (!kvar) {
      throw new NotFoundException(`Kvar sa id-jem ${id} ne postoji!`);
    }
    return kvar;
  }

  async findDostupneServisere(kategorija: KategorijaKvara) {
    return await this.korisnikRepository.find({
      where: { uloga: Uloga.SERVISER, specijalnost: kategorija },
    });
  }

  async prihvati(id: number) {
    const kvar = await this.findOne(id);
    if (kvar.status !== StatusKvara.PRIJAVLJEN) {
      throw new BadRequestException(
        `Samo prijavljeni kvarovi mogu biti prihvaceni!`,
      );
    }
    kvar.status = StatusKvara.PRIHVACEN;
    return await this.kvarRepository.save(kvar);
  }

  async odbij(id: number) {
    const kvar = await this.findOne(id);
    if (kvar.status !== StatusKvara.PRIJAVLJEN) {
      throw new BadRequestException(
        `Samo prijavljeni kvarovi mogu biti odbijeni!`,
      );
    }
    kvar.status = StatusKvara.ODBIJEN;
    return await this.kvarRepository.save(kvar);
  }

  async postaviPrioritet(id: number, dto: PostaviPrioritetDto) {
    const kvar = await this.findOne(id);
    kvar.prioritet = dto.prioritetKvara;
    return await this.kvarRepository.save(kvar);
  }

  async dodeliServisera(id: number, dto: DodeliServiseraDto) {
    const kvar = await this.findOne(id);
    if (kvar.status !== StatusKvara.PRIHVACEN) {
      throw new BadRequestException(
        `Kvar mora biti prihvacen pre dodele servisera!`,
      );
    }
    const serviser = await this.korisnikRepository.findOne({
      where: { id: dto.serviserId },
    });
    if (!serviser || serviser.uloga !== Uloga.SERVISER) {
      throw new NotFoundException(
        `Serviser sa id-jem ${dto.serviserId} ne postoji!`,
      );
    }
    kvar.serviser = serviser;
    kvar.status = StatusKvara.DODELJEN;
    return await this.kvarRepository.save(kvar);
  }

  async promeniStatus(
    id: number,
    korisnikId: number,
    dto: UpdateStatusKvarDto,
  ) {
    const kvar = await this.findOne(id);
    if (kvar.serviser?.id !== korisnikId) {
      throw new BadRequestException(
        `Samo dodeljeni serviser moze menjati status ovog kvara!`,
      );
    }
    const dozvoljeniPrelazi: Record<string, StatusKvara[]> = {
      [StatusKvara.DODELJEN]: [StatusKvara.U_TOKU],
      [StatusKvara.U_TOKU]: [StatusKvara.RESEN],
    };
    const dozvoljeni = dozvoljeniPrelazi[kvar.status] ?? [];
    if (!dozvoljeni.includes(dto.status)) {
      throw new BadRequestException(
        `Nije moguc prelaz iz statusa ${kvar.status} u ${dto.status}`,
      );
    }
    kvar.status = dto.status;
    return await this.kvarRepository.save(kvar);
  }

  async zatvori(id: number) {
    const kvar = await this.findOne(id);
    if (kvar.status !== StatusKvara.RESEN) {
      throw new BadRequestException('Samo resen kvar moze biti zatvoren.');
    }
    kvar.status = StatusKvara.ZATVOREN;
    return await this.kvarRepository.save(kvar);
  }
}
