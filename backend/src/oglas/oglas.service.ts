import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Repository } from 'typeorm';
import { Oglas } from './oglas.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { VrstaOglasa } from '../shared/enums/vrsta-oglasa.enum.js';
import { Stranica, stranicenje } from '../shared/stranicenje.js';
import { CreateOglasDto } from './dto/create-oglas.dto.js';
import { UpdateOglasDto } from './dto/update-oglas.dto.js';
import { SakrijOglasDto } from './dto/sakrij-oglas.dto.js';
import { OglasUpitDto } from './dto/oglas-upit.dto.js';

// null = sve zgrade (admin)
interface Pristup {
  zgrade: number[] | null;
  upravlja: number[] | null;
}

function sadrzi(zgrade: number[] | null, zgradaId: number) {
  return zgrade === null || zgrade.includes(zgradaId);
}

function samoZgrada(zgrade: number[] | null, zgradaId?: number) {
  if (zgradaId === undefined) {
    return zgrade;
  }
  return sadrzi(zgrade, zgradaId) ? [zgradaId] : [];
}

@Injectable()
export class OglasService {
  constructor(
    @InjectRepository(Oglas) private oglasRepository: Repository<Oglas>,
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
    private korisnikService: KorisnikService,
  ) {}

  private async pristup(korisnikId: number, uloga: Uloga): Promise<Pristup> {
    if (uloga === Uloga.ADMIN) {
      return { zgrade: null, upravlja: null };
    }
    const veze = await this.stanarStanaRepository.find({
      where: { korisnik: { id: korisnikId } },
      relations: { stan: { zgrada: true } },
      select: { id: true, stan: { id: true, zgrada: { id: true } } },
    });
    const zgradaUpravnika =
      uloga === Uloga.UPRAVNIK
        ? await this.korisnikService.zgradaUpravnika(korisnikId)
        : null;
    const upravlja = zgradaUpravnika === null ? [] : [zgradaUpravnika];
    const zgrade = [
      ...new Set([...veze.map((v) => v.stan.zgrada.id), ...upravlja]),
    ];
    return { zgrade, upravlja };
  }

  async findAll(
    korisnikId: number,
    uloga: Uloga,
    upit: OglasUpitDto,
  ): Promise<Stranica<Oglas>> {
    const p = await this.pristup(korisnikId, uloga);
    const zgrade = samoZgrada(p.zgrade, upit.zgradaId);
    const upravlja = samoZgrada(p.upravlja, upit.zgradaId);
    if (zgrade?.length === 0) {
      return { stavke: [], ukupno: 0 };
    }

    const uZgradama = (ids: number[] | null): FindOptionsWhere<Oglas> => ({
      ...(ids === null ? {} : { zgrada: { id: In(ids) } }),
      ...(upit.vrsta ? { vrsta: upit.vrsta } : {}),
    });
    // Sakriven oglas vide samo autor i upravnik zgrade
    const uslovi: FindOptionsWhere<Oglas>[] = [
      { ...uZgradama(zgrade), datumSakrivanja: IsNull() },
      { ...uZgradama(zgrade), autor: { id: korisnikId } },
    ];
    if (upravlja?.length !== 0) {
      uslovi.push(uZgradama(upravlja));
    }

    const [stavke, ukupno] = await this.oglasRepository.findAndCount({
      where: uslovi,
      relations: { zgrada: true, autor: true },
      order: { datumKreiranja: 'DESC', id: 'DESC' },
      ...stranicenje(upit),
    });

    return {
      stavke: stavke.map((oglas) => this.saPravima(oglas, korisnikId, p)),
      ukupno,
    };
  }

  async findDetalj(id: number, korisnikId: number, uloga: Uloga) {
    const { oglas, p } = await this.findDostupan(id, korisnikId, uloga);
    return this.saPravima(oglas, korisnikId, p);
  }

  async create(korisnikId: number, uloga: Uloga, dto: CreateOglasDto) {
    const p = await this.pristup(korisnikId, uloga);
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
    this.proveriVrstu(dto.vrsta, p, dto.zgradaId);

    return await this.oglasRepository.save(
      this.oglasRepository.create({
        naslov: dto.naslov,
        tekst: dto.tekst,
        vrsta: dto.vrsta,
        zgrada: { id: dto.zgradaId },
        autor: { id: korisnikId },
      }),
    );
  }

  async update(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: UpdateOglasDto,
  ) {
    const { oglas, p } = await this.findDostupan(id, korisnikId, uloga);
    if (oglas.autor.id !== korisnikId) {
      throw new ForbiddenException(
        'Oglas može da menja samo onaj ko ga je objavio.',
      );
    }
    if (dto.vrsta) {
      this.proveriVrstu(dto.vrsta, p, oglas.zgrada.id);
    }

    const rezultat = await this.oglasRepository.update(
      { id, datumSakrivanja: IsNull() },
      {
        naslov: dto.naslov ?? oglas.naslov,
        tekst: dto.tekst ?? oglas.tekst,
        vrsta: dto.vrsta ?? oglas.vrsta,
        datumIzmene: new Date(),
      },
    );
    if (rezultat.affected === 0) {
      throw new ConflictException(
        'Oglas je sakriven, pa više ne može da se menja.',
      );
    }
    return await this.findDetalj(id, korisnikId, uloga);
  }

  async remove(id: number, korisnikId: number, uloga: Uloga) {
    const { oglas } = await this.findDostupan(id, korisnikId, uloga);
    if (oglas.autor.id !== korisnikId) {
      throw new ForbiddenException(
        'Oglas može da obriše samo onaj ko ga je objavio.',
      );
    }
    await this.oglasRepository.delete(id);
  }

  async sakrij(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: SakrijOglasDto,
  ) {
    const { oglas, p } = await this.findDostupan(id, korisnikId, uloga);
    if (!this.smeDaSakrije(oglas, korisnikId, p)) {
      throw new ForbiddenException(
        'Tuđ oglas može da sakrije samo upravnik zgrade.',
      );
    }

    const rezultat = await this.oglasRepository.update(
      { id, datumSakrivanja: IsNull() },
      { datumSakrivanja: new Date(), razlogSakrivanja: dto.razlog },
    );
    if (rezultat.affected === 0) {
      throw new ConflictException('Oglas je već sakriven.');
    }
    return await this.findDetalj(id, korisnikId, uloga);
  }

  private async findDostupan(id: number, korisnikId: number, uloga: Uloga) {
    const oglas = await this.oglasRepository.findOne({
      where: { id },
      relations: { zgrada: true, autor: true },
    });
    if (!oglas) {
      throw new NotFoundException(`Oglas sa id-jem ${id} ne postoji!`);
    }
    const p = await this.pristup(korisnikId, uloga);
    const vidi =
      sadrzi(p.upravlja, oglas.zgrada.id) ||
      (sadrzi(p.zgrade, oglas.zgrada.id) &&
        (oglas.datumSakrivanja === null || oglas.autor.id === korisnikId));
    if (!vidi) {
      throw new ForbiddenException('Nemate pristup ovom oglasu!');
    }
    return { oglas, p };
  }

  private smeDaSakrije(oglas: Oglas, korisnikId: number, p: Pristup) {
    return oglas.autor.id !== korisnikId && sadrzi(p.upravlja, oglas.zgrada.id);
  }

  private saPravima(oglas: Oglas, korisnikId: number, p: Pristup) {
    const autor = oglas.autor.id === korisnikId;
    const aktivan = oglas.datumSakrivanja === null;
    return Object.assign(oglas, {
      smeDaMenja: autor && aktivan,
      smeDaObrise: autor,
      smeDaSakrije: aktivan && this.smeDaSakrije(oglas, korisnikId, p),
    });
  }

  private proveriVrstu(vrsta: VrstaOglasa, p: Pristup, zgradaId: number) {
    if (vrsta === VrstaOglasa.OBAVESTENJE && !sadrzi(p.upravlja, zgradaId)) {
      throw new ForbiddenException('Obaveštenje objavljuje upravnik zgrade.');
    }
  }
}
