import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  In,
  IsNull,
  MoreThan,
  Or,
  Repository,
} from 'typeorm';
import { Oglas } from './oglas.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import {
  type PristupZgradama,
  sadrzi,
  samoZgrada,
} from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { VrstaOglasa } from '../shared/enums/vrsta-oglasa.enum.js';
import { OglasUpitDto } from './dto/oglas-upit.dto.js';

export function istekao(oglas: Oglas, sada = new Date()) {
  return oglas.vaziDo !== null && oglas.vaziDo <= sada;
}

@Injectable()
export class OglasPravaService {
  constructor(
    @InjectRepository(Oglas) private oglasRepository: Repository<Oglas>,
    private korisnikService: KorisnikService,
  ) {}

  // Prazan niz znači da korisnik ne vidi nijedan oglas
  usloviVidljivosti(
    korisnikId: number,
    p: PristupZgradama,
    upit: OglasUpitDto,
  ): FindOptionsWhere<Oglas>[] {
    const zgrade = samoZgrada(p.zgrade, upit.zgradaId);
    const upravlja = samoZgrada(p.upravlja, upit.zgradaId);
    if (zgrade?.length === 0) {
      return [];
    }

    const uZgradama = (ids: number[] | null): FindOptionsWhere<Oglas> => ({
      ...(ids === null ? {} : { zgrada: { id: In(ids) } }),
      ...(upit.vrsta ? { vrsta: upit.vrsta } : {}),
    });
    // Admin vidi sve; sakriven i istekao oglas od ostalih vide samo autor i upravnik zgrade.
    // Admin ima poseban uslov jer TypeORM prazan uslov {} izbaci iz OR niza.
    return upravlja === null
      ? [uZgradama(zgrade)]
      : [
          {
            ...uZgradama(zgrade),
            datumSakrivanja: IsNull(),
            vaziDo: Or(IsNull(), MoreThan(new Date())),
          },
          { ...uZgradama(zgrade), autor: { id: korisnikId } },
          ...(upravlja.length > 0 ? [uZgradama(upravlja)] : []),
        ];
  }

  async findDostupan(id: number, korisnikId: number, uloga: Uloga) {
    const oglas = await this.oglasRepository.findOne({
      where: { id },
      relations: { zgrada: true, autor: true, prilozi: true },
    });
    if (!oglas) {
      throw new NotFoundException(`Oglas sa id-jem ${id} ne postoji!`);
    }
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    const vidi =
      sadrzi(p.upravlja, oglas.zgrada.id) ||
      (sadrzi(p.zgrade, oglas.zgrada.id) &&
        ((oglas.datumSakrivanja === null && !istekao(oglas)) ||
          oglas.autor.id === korisnikId));
    if (!vidi) {
      throw new ForbiddenException('Nemate pristup ovom oglasu!');
    }
    return { oglas, p };
  }

  async findZaIzmenu(id: number, korisnikId: number, uloga: Uloga) {
    const dostupan = await this.findDostupan(id, korisnikId, uloga);
    if (dostupan.oglas.autor.id !== korisnikId) {
      throw new ForbiddenException(
        'Oglas može da menja samo onaj ko ga je objavio.',
      );
    }
    return dostupan;
  }

  smeDaSakrije(oglas: Oglas, korisnikId: number, p: PristupZgradama) {
    return oglas.autor.id !== korisnikId && sadrzi(p.upravlja, oglas.zgrada.id);
  }

  proveriVrstu(vrsta: VrstaOglasa, p: PristupZgradama, zgradaId: number) {
    if (vrsta === VrstaOglasa.OBAVESTENJE && !sadrzi(p.upravlja, zgradaId)) {
      throw new ForbiddenException('Obaveštenje objavljuje upravnik zgrade.');
    }
  }
}
