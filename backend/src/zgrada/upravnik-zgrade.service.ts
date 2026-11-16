import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { Zgrada } from './zgrada.entity.js';
import { AKTIVNA_ZGRADA } from './aktivna-zgrada.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { AKTIVAN_KORISNIK } from '../korisnik/aktivan-korisnik.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { OglasService } from '../oglas/oglas.service.js';
import { zakljucajVeze } from '../stanar-stana/veze-u-zgradi.js';

@Injectable()
export class UpravnikZgradeService {
  constructor(
    private dataSource: DataSource,
    private oglasService: OglasService,
  ) {}

  async find(zgradaId: number) {
    const zgrada = await this.dataSource.manager.findOne(Zgrada, {
      where: { id: zgradaId, ...AKTIVNA_ZGRADA },
      relations: { upravnik: true },
      select: {
        id: true,
        upravnik: {
          id: true,
          ime: true,
          prezime: true,
          email: true,
          telefon: true,
        },
      },
    });
    if (!zgrada) {
      throw new NotFoundException(`Zgrada sa id-jem ${zgradaId} ne postoji!`);
    }
    return { korisnik: zgrada.upravnik };
  }

  async postavi(zgradaId: number, korisnikId: number) {
    await this.dataSource.transaction(async (manager) => {
      const { upravnikId } = await this.zakljucajZgradu(manager, zgradaId);
      await this.zakljucajKorisnike(manager, [korisnikId, upravnikId]);

      const korisnik = await manager.findOne(Korisnik, {
        where: { id: korisnikId, ...AKTIVAN_KORISNIK },
        select: { id: true, uloga: true },
      });
      if (!korisnik) {
        throw new NotFoundException('Korisnik ne postoji.');
      }
      if (
        korisnik.uloga !== Uloga.STANAR &&
        korisnik.uloga !== Uloga.UPRAVNIK
      ) {
        throw new BadRequestException(
          'Za upravnika se može postaviti samo stanar ili upravnik.',
        );
      }
      if (upravnikId === korisnikId) {
        return;
      }

      await this.smeni(manager, zgradaId, upravnikId);
      await manager.update(Zgrada, zgradaId, { upravnikId: korisnikId });
      await manager.update(Korisnik, korisnikId, { uloga: Uloga.UPRAVNIK });
    });
    return await this.find(zgradaId);
  }

  async razresi(zgradaId: number) {
    await this.dataSource.transaction(async (manager) => {
      const { upravnikId } = await this.zakljucajZgradu(manager, zgradaId);
      if (upravnikId === null) {
        throw new NotFoundException('Zgrada nema upravnika.');
      }
      await this.zakljucajKorisnike(manager, [upravnikId]);
      await this.smeni(manager, zgradaId, upravnikId);
    });
  }

  async skiniUpravnika(manager: EntityManager, zgradaId: number) {
    const zgrada = await manager.findOneOrFail(Zgrada, {
      where: { id: zgradaId },
      select: { id: true, upravnikId: true },
    });
    if (zgrada.upravnikId === null) {
      return;
    }
    await this.zakljucajKorisnike(manager, [zgrada.upravnikId]);
    await this.ukloni(manager, zgradaId, zgrada.upravnikId);
  }

  async razresiSvuda(manager: EntityManager, korisnikId: number) {
    await manager.update(
      Zgrada,
      { upravnikId: korisnikId },
      { upravnikId: null },
    );
    await manager.update(
      Korisnik,
      { id: korisnikId, uloga: Uloga.UPRAVNIK },
      { uloga: Uloga.STANAR },
    );
  }

  private async zakljucajZgradu(manager: EntityManager, zgradaId: number) {
    const zgrada = await manager.findOne(Zgrada, {
      where: { id: zgradaId, ...AKTIVNA_ZGRADA },
      select: { id: true, upravnikId: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!zgrada) {
      throw new NotFoundException(`Zgrada sa id-jem ${zgradaId} ne postoji!`);
    }
    return zgrada;
  }

  private async zakljucajKorisnike(
    manager: EntityManager,
    ids: (number | null)[],
  ) {
    await manager.find(Korisnik, {
      where: { id: In(ids.filter((id) => id !== null)) },
      select: { id: true },
      order: { id: 'ASC' },
      lock: { mode: 'pessimistic_write' },
    });
  }

  private async smeni(
    manager: EntityManager,
    zgradaId: number,
    bivsi: number | null,
  ) {
    if (bivsi === null) {
      return;
    }
    await this.ukloni(manager, zgradaId, bivsi);
    const veze = await zakljucajVeze(manager, bivsi, zgradaId);
    if (veze.length === 0) {
      await this.oglasService.sakrijOglase(
        manager,
        { autor: { id: bivsi }, zgrada: { id: zgradaId } },
        'Autor više ne upravlja zgradom.',
      );
    }
  }

  private async ukloni(
    manager: EntityManager,
    zgradaId: number,
    bivsi: number,
  ) {
    await manager.update(Zgrada, zgradaId, { upravnikId: null });
    if (!(await manager.exists(Zgrada, { where: { upravnikId: bivsi } }))) {
      await manager.update(Korisnik, bivsi, { uloga: Uloga.STANAR });
    }
  }
}
