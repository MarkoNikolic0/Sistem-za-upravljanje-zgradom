import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource, EntityManager, IsNull, MoreThan, Not } from 'typeorm';
import { Glasanje } from './glasanje.entity.js';
import { Glas, JEDAN_GLAS_ANKETE, JEDAN_GLAS_STANA } from './glas.entity.js';
import { GlasanjeRezultatiService } from './glasanje-rezultati.service.js';
import {
  GlasanjePravaService,
  PORUKA_VLASNICI,
} from './glasanje-prava.service.js';
import type { PristupZgradama } from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { VrstaGlasanja } from '../shared/enums/glasanje.enums.js';
import { greskaPolja } from '../shared/greske-validacije.js';

export const PORUKA_ZAVRSENA = 'Glasanje je završeno.';

@Injectable()
export class GlasanjeGlasoviService {
  constructor(
    private rezultati: GlasanjeRezultatiService,
    private prava: GlasanjePravaService,
    private dataSource: DataSource,
  ) {}

  async glasaj(id: number, korisnikId: number, uloga: Uloga, opcijaId: number) {
    const { glasanje, p } = await this.prava.findZaGlasanje(
      id,
      korisnikId,
      uloga,
    );
    if (!glasanje.opcije.some((opcija) => opcija.id === opcijaId)) {
      throw greskaPolja('opcijaId', 'Izabrana opcija nije u ovom glasanju.');
    }

    await this.dataSource.transaction(async (manager) => {
      await this.proveriDaJeOtvoreno(manager, id);
      if (glasanje.vrsta === VrstaGlasanja.ODLUKA) {
        await this.glasajZaStanove(manager, glasanje, korisnikId, opcijaId, p);
        return;
      }
      // Novi glas ili promena postojeceg, u jednom upitu
      await manager
        .createQueryBuilder()
        .insert()
        .into(Glas)
        .values({
          glasanje: { id },
          opcija: { id: opcijaId },
          korisnik: { id: korisnikId },
        })
        .orUpdate(['opcijaId', 'datumGlasanja'], ['glasanjeId', 'korisnikId'], {
          indexPredicate: JEDAN_GLAS_ANKETE,
        })
        .execute();
    });
    return this.rezultati.jedno(id, korisnikId, p);
  }

  async povuciGlas(id: number, korisnikId: number, uloga: Uloga) {
    const { glasanje, p } = await this.prava.findZaGlasanje(
      id,
      korisnikId,
      uloga,
    );
    await this.dataSource.transaction(async (manager) => {
      await this.proveriDaJeOtvoreno(manager, id);
      await manager.delete(Glas, {
        glasanje: { id },
        korisnik: { id: korisnikId },
        stan:
          glasanje.vrsta === VrstaGlasanja.ODLUKA ? Not(IsNull()) : IsNull(),
      });
    });
    return this.rezultati.jedno(id, korisnikId, p);
  }

  private async proveriDaJeOtvoreno(manager: EntityManager, id: number) {
    const otvoreno = await manager.findOne(Glasanje, {
      where: { id, rok: MoreThan(new Date()) },
      select: { id: true },
      lock: { mode: 'pessimistic_read' },
    });
    if (!otvoreno) {
      throw new ConflictException(PORUKA_ZAVRSENA);
    }
  }

  private async glasajZaStanove(
    manager: EntityManager,
    glasanje: Glasanje,
    korisnikId: number,
    opcijaId: number,
    p: PristupZgradama,
  ) {
    const stanovi = p.vlasnickiStanovi
      .filter((stan) => stan.zgradaId === glasanje.zgrada.id)
      .map((stan) => stan.id);
    if (stanovi.length === 0) {
      throw new ForbiddenException(PORUKA_VLASNICI);
    }

    const { raw } = await manager
      .createQueryBuilder()
      .insert()
      .into(Glas)
      .values(
        stanovi.map((stanId) => ({
          glasanje: { id: glasanje.id },
          opcija: { id: opcijaId },
          korisnik: { id: korisnikId },
          stan: { id: stanId },
        })),
      )
      .orUpdate(['opcijaId', 'datumGlasanja'], ['glasanjeId', 'stanId'], {
        indexPredicate: JEDAN_GLAS_STANA,
        overwriteCondition: { where: { korisnik: { id: korisnikId } } },
      })
      .execute();
    if (raw.length === 0) {
      throw new ConflictException('Za tvoj stan je već glasao suvlasnik.');
    }
  }
}
