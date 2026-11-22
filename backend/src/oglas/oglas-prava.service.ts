import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
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
import { istekao, vidljivSvima } from './oglas.constants.js';
import { nePostoji } from '../shared/ne-postoji.js';

// Šta sa oglasom sme samo onaj ko ga je objavio
type RadnjaAutora = 'menja' | 'obnovi';

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
    if (zgrade.length === 0) {
      return [];
    }

    const uslov = (ids: number[]): FindOptionsWhere<Oglas> => ({
      ...uZgradama(ids),
      ...(upit.vrsta ? { vrsta: upit.vrsta } : {}),
    });
    return [
      { ...uslov(zgrade), ...vidljivSvima() },
      { ...uslov(zgrade), autor: { id: korisnikId } },
      ...(upravlja.length > 0 ? [uslov(upravlja)] : []),
    ];
  }

  async findDostupan(id: number, korisnikId: number, uloga: Uloga) {
    const oglas = await this.oglasRepository.findOne({
      where: { id },
      relations: { zgrada: true, autor: true, prilozi: true },
    });
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    const vidi =
      oglas !== null &&
      (sadrzi(p.upravlja, oglas.zgrada.id) ||
        (sadrzi(p.zgrade, oglas.zgrada.id) &&
          ((oglas.datumSakrivanja === null && !istekao(oglas)) ||
            oglas.autor.id === korisnikId)));
    if (!vidi) {
      throw nePostoji('Oglas', id);
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

  async findZaBrisanje(id: number, korisnikId: number, uloga: Uloga) {
    const dostupan = await this.findDostupan(id, korisnikId, uloga);
    if (!this.smeDaObrise(dostupan.oglas, korisnikId, dostupan.p)) {
      throw new ForbiddenException(
        'Oglas briše onaj ko ga je objavio, a sakriven oglas i upravnik zgrade.',
      );
    }
    return dostupan;
  }

  smeDaObrise(oglas: Oglas, korisnikId: number, p: PristupZgradama) {
    return (
      oglas.autor.id === korisnikId ||
      (oglas.datumSakrivanja !== null && sadrzi(p.upravlja, oglas.zgrada.id))
    );
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
