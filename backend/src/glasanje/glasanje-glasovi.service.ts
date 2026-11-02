import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Glasanje } from './glasanje.entity.js';
import { Glas, JEDAN_GLAS_ANKETE, JEDAN_GLAS_STANA } from './glas.entity.js';
import { GlasanjeRezultatiService } from './glasanje-rezultati.service.js';
import { GlasanjePravaService } from './glasanje-prava.service.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { VrstaGlasanja } from '../shared/enums/glasanje.enums.js';
import { greskaPolja } from '../shared/greske-validacije.js';
import { DataSource, EntityManager, In, IsNull, MoreThan, Not } from 'typeorm';
import {
  PORUKA_STANARI,
  PORUKA_VLASNICI,
  PORUKA_ZAVRSENA,
} from './glasanje.constants.js';
import { zakljucajVeze } from '../stanar-stana/veze-u-zgradi.js';
import type { StanarStana } from '../stanar-stana/stanar-stana.entity.js';

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
      const veze = await zakljucajVeze(manager, korisnikId, glasanje.zgrada.id);
      if (glasanje.vrsta === VrstaGlasanja.ODLUKA) {
        await this.glasajZaStanove(
          manager,
          glasanje,
          korisnikId,
          opcijaId,
          veze,
        );
        return;
      }
      if (veze.length === 0) {
        throw new ForbiddenException(PORUKA_STANARI);
      }
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

  async ukloniGlasove(
    manager: EntityManager,
    korisnikId: number,
    zgradaId: number,
    stanId: number,
    iAnkete: boolean,
  ) {
    const aktivna = await manager.find(Glasanje, {
      where: { zgrada: { id: zgradaId }, rok: MoreThan(new Date()) },
      select: { id: true },
    });
    if (aktivna.length === 0) {
      return;
    }
    const uslov = {
      glasanje: { id: In(aktivna.map((g) => g.id)) },
      korisnik: { id: korisnikId },
    };
    await manager.delete(Glas, { ...uslov, stan: { id: stanId } });
    if (iAnkete) {
      await manager.delete(Glas, { ...uslov, stan: IsNull() });
    }
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
    veze: StanarStana[],
  ) {
    const stanovi = veze.filter((v) => v.vlasnik).map((v) => v.stan.id);
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
