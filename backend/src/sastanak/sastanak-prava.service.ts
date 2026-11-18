import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { Sastanak } from './sastanak.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import {
  type PristupZgradama,
  sadrzi,
  zgradeVlasnika,
} from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { VrstaSastanka } from '../shared/enums/sastanak.enums.js';
import { nePostoji } from '../shared/ne-postoji.js';

const DETALJI: FindOptionsRelations<Sastanak> = {
  zgrada: true,
  organizator: true,
  tacke: { odluka: true },
};

export const SAMO_ZGRADA: FindOptionsRelations<Sastanak> = { zgrada: true };

export function zgradeVrste(vrsta: VrstaSastanka, p: PristupZgradama) {
  return vrsta === VrstaSastanka.SKUPSTINA ? zgradeVlasnika(p) : p.zgrade;
}

export function smeDaNajavi(sastanak: Sastanak, p: PristupZgradama) {
  const zgrade =
    sastanak.vrsta === VrstaSastanka.SKUPSTINA ? p.poseduje : p.stanuje;
  return sadrzi(zgrade, sastanak.zgrada.id);
}

@Injectable()
export class SastanakPravaService {
  constructor(
    @InjectRepository(Sastanak)
    private sastanakRepository: Repository<Sastanak>,
    private korisnikService: KorisnikService,
  ) {}

  async findDostupno(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    relations = DETALJI,
  ) {
    const sastanak = await this.sastanakRepository.findOne({
      where: { id },
      relations,
    });
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    if (
      !sastanak ||
      !sadrzi(zgradeVrste(sastanak.vrsta, p), sastanak.zgrada.id)
    ) {
      throw nePostoji('Sastanak', id);
    }
    return { sastanak, p };
  }

  async findZaUpravljanje(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    relations = DETALJI,
  ) {
    const dostupno = await this.findDostupno(id, korisnikId, uloga, relations);
    if (!sadrzi(dostupno.p.upravlja, dostupno.sastanak.zgrada.id)) {
      throw new ForbiddenException('Sastankom upravlja upravnik zgrade.');
    }
    return dostupno;
  }
}
