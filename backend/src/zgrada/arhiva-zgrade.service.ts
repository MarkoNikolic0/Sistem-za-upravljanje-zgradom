import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Raw } from 'typeorm';
import { Zgrada } from './zgrada.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { Glas } from '../glasanje/glas.entity.js';
import { PratilacKvara } from '../pratilac-kvara/pratilac-kvara.entity.js';
import { UpravnikZgradeService } from './upravnik-zgrade.service.js';
import { OglasService } from '../oglas/oglas.service.js';
import { NotifikacijaService } from '../notifikacija/notifikacija.service.js';
import { TipNotifikacije } from '../notifikacija/notifikacija.entity.js';
import { stanariZgrade, upravnikZgrade } from '../notifikacija/primaoci.js';
import { odbijZahteve } from '../zahtev-povezivanje/odbij-zahteve.js';
import { obrisiBuduceNajave } from '../sastanak/najave-prisustva.js';

function uZgradi(
  tabela: 'stan' | 'kvar' | 'glasanje',
  zgradaId: number,
  uslov = '',
) {
  return Raw(
    (kolona) =>
      `${kolona} IN (SELECT "id" FROM "${tabela}" WHERE "zgradaId" = :zgradaId ${uslov})`,
    { zgradaId },
  );
}

@Injectable()
export class ArhivaZgradeService {
  constructor(
    private dataSource: DataSource,
    private upravnikService: UpravnikZgradeService,
    private oglasService: OglasService,
    private notifikacije: NotifikacijaService,
  ) {}

  async arhiviraj(zgradaId: number) {
    await this.dataSource.transaction(async (manager) => {
      const zgrada = await this.zakljucaj(manager, zgradaId);
      if (zgrada.arhivirana) {
        return;
      }
      await odbijZahteve(
        manager,
        this.notifikacije,
        { stan: { zgrada: { id: zgradaId } } },
        'Zgrada je arhivirana.',
      );
      const stanari = await stanariZgrade(manager, zgradaId);
      await this.notifikacije.obrisiZaZgradu(
        manager,
        [...stanari, ...(await upravnikZgrade(manager, zgradaId))],
        zgradaId,
      );
      await this.notifikacije.obavesti(manager, stanari, {
        tip: TipNotifikacije.STANOVANJE,
        tekst: `Zgrada „${zgrada.naziv}“ je arhivirana, pa više nisi njen stanar.`,
        link: '/profil',
      });
      await obrisiBuduceNajave(manager, zgradaId);
      await manager.delete(StanarStana, {
        stan: { id: uZgradi('stan', zgradaId) },
      });
      await manager.delete(Glas, {
        glasanje: { id: uZgradi('glasanje', zgradaId, 'AND "rok" > now()') },
      });
      await manager.delete(PratilacKvara, {
        kvar: { id: uZgradi('kvar', zgradaId) },
      });

      await this.oglasService.sakrijOglase(
        manager,
        { zgrada: { id: zgradaId } },
        'Zgrada je arhivirana.',
      );
      await this.upravnikService.skiniUpravnika(manager, zgradaId);
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
      select: { id: true, naziv: true, arhivirana: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!zgrada) {
      throw new NotFoundException(`Zgrada sa id-jem ${zgradaId} ne postoji!`);
    }
    return zgrada;
  }
}
