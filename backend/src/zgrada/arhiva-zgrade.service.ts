import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In, MoreThan } from 'typeorm';
import { Zgrada } from './zgrada.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { ZahtevPovezivanje } from '../zahtev-povezivanje/zahtev-povezivanje.entity.js';
import { Glasanje } from '../glasanje/glasanje.entity.js';
import { Glas } from '../glasanje/glas.entity.js';
import { Kvar } from '../kvar/kvar.entity.js';
import { PratilacKvara } from '../pratilac-kvara/pratilac-kvara.entity.js';
import { StatusZahteva } from '../shared/enums/status-zahteva.enum.js';
import { UpravnikZgradeService } from './upravnik-zgrade.service.js';

@Injectable()
export class ArhivaZgradeService {
  constructor(
    private dataSource: DataSource,
    private upravnikService: UpravnikZgradeService,
  ) {}

  async arhiviraj(zgradaId: number) {
    await this.dataSource.transaction(async (manager) => {
      const zgrada = await this.zakljucaj(manager, zgradaId);
      if (zgrada.arhivirana) {
        return;
      }
      const stanovi = await this.idjevi(manager, Stan, zgradaId);
      if (stanovi.length > 0) {
        await manager.update(
          ZahtevPovezivanje,
          { stan: { id: In(stanovi) }, status: StatusZahteva.NA_CEKANJU },
          { status: StatusZahteva.ODBIJEN },
        );
        await manager.delete(StanarStana, { stan: { id: In(stanovi) } });
      }

      const glasanja = await manager.find(Glasanje, {
        where: { zgrada: { id: zgradaId }, rok: MoreThan(new Date()) },
        select: { id: true },
      });
      if (glasanja.length > 0) {
        await manager.delete(Glas, {
          glasanje: { id: In(glasanja.map((g) => g.id)) },
        });
      }
      const kvarovi = await this.idjevi(manager, Kvar, zgradaId);
      if (kvarovi.length > 0) {
        await manager.delete(PratilacKvara, { kvar: { id: In(kvarovi) } });
      }

      await this.upravnikService.vratiUStanara(manager, zgradaId);
      await manager.update(Zgrada, zgradaId, { arhivirana: new Date() });
    });
  }

  async vrati(zgradaId: number) {
    await this.dataSource.transaction(async (manager) => {
      await this.zakljucaj(manager, zgradaId);
      await manager.update(Zgrada, zgradaId, { arhivirana: null });
    });
  }

  private async zakljucaj(manager: EntityManager, zgradaId: number) {
    const zgrada = await manager.findOne(Zgrada, {
      where: { id: zgradaId },
      select: { id: true, arhivirana: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!zgrada) {
      throw new NotFoundException(`Zgrada sa id-jem ${zgradaId} ne postoji!`);
    }
    return zgrada;
  }

  private async idjevi(
    manager: EntityManager,
    entitet: typeof Stan | typeof Kvar,
    zgradaId: number,
  ) {
    const redovi = await manager.find(entitet, {
      where: { zgrada: { id: zgradaId } },
      select: { id: true },
    });
    return redovi.map((r) => r.id);
  }
}
