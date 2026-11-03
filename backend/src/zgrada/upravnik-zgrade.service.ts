import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Zgrada } from './zgrada.entity.js';
import { AKTIVNA_ZGRADA, proveriAktivnu } from './aktivna-zgrada.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { Uloga } from '../shared/enums/uloga.enum.js';

@Injectable()
export class UpravnikZgradeService {
  constructor(
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
    private dataSource: DataSource,
  ) {}

  async find(zgradaId: number) {
    await proveriAktivnu(this.dataSource.manager, zgradaId);
    const korisnik = await this.korisnikRepository.findOne({
      where: { uloga: Uloga.UPRAVNIK, zgrada: { id: zgradaId } },
      select: {
        id: true,
        ime: true,
        prezime: true,
        email: true,
        telefon: true,
      },
    });
    return { korisnik };
  }

  async postavi(zgradaId: number, korisnikId: number) {
    await this.dataSource.transaction(async (manager) => {
      await this.zakljucajZgradu(manager, zgradaId);

      const korisnik = await manager.findOne(Korisnik, {
        where: { id: korisnikId },
        relations: { zgrada: true },
        lock: { mode: 'pessimistic_write', tables: ['korisnik'] },
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
      if (korisnik.zgrada?.id === zgradaId) {
        return;
      }
      if (korisnik.zgrada) {
        throw new ConflictException(
          `${korisnik.ime} ${korisnik.prezime} već upravlja zgradom „${korisnik.zgrada.naziv}“. Prvo razreši upravnika te zgrade.`,
        );
      }

      await this.vratiUStanara(manager, zgradaId);
      await manager.update(Korisnik, korisnikId, {
        uloga: Uloga.UPRAVNIK,
        zgrada: { id: zgradaId },
      });
    });
    return await this.find(zgradaId);
  }

  async razresi(zgradaId: number) {
    await this.dataSource.transaction(async (manager) => {
      await this.zakljucajZgradu(manager, zgradaId);
      if (!(await this.vratiUStanara(manager, zgradaId))) {
        throw new NotFoundException('Zgrada nema upravnika.');
      }
    });
  }

  private async zakljucajZgradu(manager: EntityManager, zgradaId: number) {
    const zgrada = await manager.findOne(Zgrada, {
      where: { id: zgradaId, ...AKTIVNA_ZGRADA },
      select: { id: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!zgrada) {
      throw new NotFoundException(`Zgrada sa id-jem ${zgradaId} ne postoji!`);
    }
  }

  async vratiUStanara(manager: EntityManager, zgradaId: number) {
    const upravnik = await manager.findOne(Korisnik, {
      where: { zgrada: { id: zgradaId } },
      select: { id: true },
    });
    if (!upravnik) {
      return false;
    }
    await manager.update(Korisnik, upravnik.id, {
      uloga: Uloga.STANAR,
      zgrada: null,
    });
    return true;
  }
}
