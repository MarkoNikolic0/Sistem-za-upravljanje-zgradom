import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, MoreThan, Or, Repository } from 'typeorm';
import { Oglas } from './oglas.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import {
  type PristupZgradama,
  sadrzi,
  samoZgrada,
  uZgradama,
} from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { VrstaOglasa } from '../shared/enums/vrsta-oglasa.enum.js';
import { OglasUpitDto } from './dto/oglas-upit.dto.js';
import { istekao } from './oglas.constants.js';

// Šta sa oglasom sme samo onaj ko ga je objavio
type RadnjaAutora = 'menja' | 'obriše' | 'obnovi';

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

    const uslov = (ids: number[] | null): FindOptionsWhere<Oglas> => ({
      ...uZgradama(ids),
      ...(upit.vrsta ? { vrsta: upit.vrsta } : {}),
    });
    // Admin vidi sve; sakriven i istekao oglas od ostalih vide samo autor i upravnik zgrade.
    return upravlja === null
      ? [uslov(zgrade)]
      : [
          {
            ...uslov(zgrade),
            datumSakrivanja: IsNull(),
            vaziDo: Or(IsNull(), MoreThan(new Date())),
          },
          { ...uslov(zgrade), autor: { id: korisnikId } },
          ...(upravlja.length > 0 ? [uslov(upravlja)] : []),
        ];
  }

  async findDostupan(id: number, korisnikId: number, uloga: Uloga) {
    const oglas = await this.oglasRepository.findOne({
      where: { id },
      relations: { zgrada: true, autor: true, prilozi: true },
    });
    if (!oglas || oglas.zgrada.arhivirana) {
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

  async findZaAutora(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    radnja: RadnjaAutora,
  ) {
    const dostupan = await this.findDostupan(id, korisnikId, uloga);
    if (dostupan.oglas.autor.id !== korisnikId) {
      throw new ForbiddenException(
        `Oglas može da ${radnja} samo onaj ko ga je objavio.`,
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
