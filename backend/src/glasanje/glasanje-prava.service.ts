import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Glasanje } from './glasanje.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { type PristupZgradama, sadrzi } from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { VrstaGlasanja } from '../shared/enums/glasanje.enums.js';

export const PORUKA_VLASNICI = 'Za odluke glasaju vlasnici stanova u zgradi.';

// Odluke vide samo vlasnici stanova u zgradi, upravnik i admin
export function zgradeOdluka(p: PristupZgradama) {
  return p.upravlja === null
    ? null
    : [...new Set([...p.poseduje, ...p.upravlja])];
}

@Injectable()
export class GlasanjePravaService {
  constructor(
    @InjectRepository(Glasanje)
    private glasanjeRepository: Repository<Glasanje>,
    private korisnikService: KorisnikService,
  ) {}

  async findDostupno(id: number, korisnikId: number, uloga: Uloga) {
    const glasanje = await this.glasanjeRepository.findOne({
      where: { id },
      relations: { zgrada: true, kreirao: true, opcije: true },
    });
    if (!glasanje) {
      throw new NotFoundException(`Glasanje sa id-jem ${id} ne postoji!`);
    }
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    const zgrade =
      glasanje.vrsta === VrstaGlasanja.ODLUKA ? zgradeOdluka(p) : p.zgrade;
    if (!sadrzi(zgrade, glasanje.zgrada.id)) {
      throw new ForbiddenException('Nemate pristup ovom glasanju!');
    }
    return { glasanje, p };
  }

  async findZaGlasanje(id: number, korisnikId: number, uloga: Uloga) {
    const dostupno = await this.findDostupno(id, korisnikId, uloga);
    const { glasanje, p } = dostupno;
    if (glasanje.vrsta === VrstaGlasanja.ODLUKA) {
      if (!p.poseduje.includes(glasanje.zgrada.id)) {
        throw new ForbiddenException(PORUKA_VLASNICI);
      }
    } else if (!p.stanuje.includes(glasanje.zgrada.id)) {
      throw new ForbiddenException('Glasaju stanari ove zgrade.');
    }
    return dostupno;
  }

  async findZaUpravljanje(id: number, korisnikId: number, uloga: Uloga) {
    const dostupno = await this.findDostupno(id, korisnikId, uloga);
    if (!sadrzi(dostupno.p.upravlja, dostupno.glasanje.zgrada.id)) {
      throw new ForbiddenException('Glasanjem upravlja upravnik zgrade.');
    }
    return dostupno;
  }
}
