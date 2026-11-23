import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Glasanje } from './glasanje.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import {
  type PristupZgradama,
  sadrzi,
  samoZgrada,
  uZgradama,
  zgradeVlasnika,
} from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { VrstaGlasanja } from '../shared/enums/glasanje.enums.js';
import { PORUKA_STANARI, PORUKA_VLASNICI } from './glasanje.constants.js';
import { nePostoji } from '../shared/ne-postoji.js';
import { PromeneService } from '../notifikacija/promene.service.js';
import { vidiZgradu } from '../notifikacija/primaoci.js';

export function javiPromenuGlasanja(
  promene: PromeneService,
  glasanje: Glasanje,
  korisnikId: number,
) {
  promene.javi(
    { vrsta: 'glasanje', id: glasanje.id },
    (manager) =>
      vidiZgradu(
        manager,
        glasanje.zgrada.id,
        glasanje.vrsta === VrstaGlasanja.ODLUKA,
      ),
    [korisnikId],
  );
}

@Injectable()
export class GlasanjePravaService {
  constructor(
    @InjectRepository(Glasanje)
    private glasanjeRepository: Repository<Glasanje>,
    private korisnikService: KorisnikService,
  ) {}

  usloviVidljivosti(
    p: PristupZgradama,
    zgradaId?: number,
  ): FindOptionsWhere<Glasanje>[] {
    return [
      { vrsta: VrstaGlasanja.ANKETA, zgrade: p.zgrade },
      { vrsta: VrstaGlasanja.ODLUKA, zgrade: zgradeVlasnika(p) },
    ]
      .map(({ vrsta, zgrade }) => ({
        vrsta,
        zgrade: samoZgrada(zgrade, zgradaId),
      }))
      .filter(({ zgrade }) => zgrade.length > 0)
      .map(({ vrsta, zgrade }) => ({
        vrsta,
        ...uZgradama(zgrade),
      }));
  }

  async findDostupno(id: number, korisnikId: number, uloga: Uloga) {
    const glasanje = await this.glasanjeRepository.findOne({
      where: { id },
      relations: { zgrada: true, kreirao: true, opcije: true },
    });
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    const zgrade =
      glasanje?.vrsta === VrstaGlasanja.ODLUKA ? zgradeVlasnika(p) : p.zgrade;
    if (!glasanje || !sadrzi(zgrade, glasanje.zgrada.id)) {
      throw nePostoji('Glasanje', id);
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
      throw new ForbiddenException(PORUKA_STANARI);
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
