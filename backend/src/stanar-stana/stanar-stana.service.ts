import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { StanarStana } from './stanar-stana.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { GlasanjeGlasoviService } from '../glasanje/glasanje-glasovi.service.js';
import { PratilacKvaraService } from '../pratilac-kvara/pratilac-kvara.service.js';
import { zakljucajVeze } from './veze-u-zgradi.js';
import { stanoviSaStanarima } from './stanovi-sa-stanarima.js';
import { UpdateStanarStanaDto } from './dto/update-stanar-stana.dto.js';
import { OglasService } from '../oglas/oglas.service.js';

@Injectable()
export class StanarStanaService {
  constructor(
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    private korisnikService: KorisnikService,
    private glasoviService: GlasanjeGlasoviService,
    private pracenjaService: PratilacKvaraService,
    private oglasService: OglasService,
    private dataSource: DataSource,
  ) {}

  async findAll(zgradaId: number, korisnikId: number, uloga: Uloga) {
    await this.korisnikService.proveriUpravnikaZgrade(
      korisnikId,
      uloga,
      zgradaId,
      'Stanare vidi samo upravnik ove zgrade!',
    );

    return stanoviSaStanarima(this.dataSource.manager, zgradaId);
  }

  async update(
    zgradaId: number,
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: UpdateStanarStanaDto,
  ) {
    await this.proveriUpravnika(zgradaId, korisnikId, uloga);

    return await this.dataSource.transaction(async (manager) => {
      const { veza, stanarId } = await this.zakljucajVezu(
        manager,
        zgradaId,
        id,
      );
      if (veza.vlasnik && !dto.vlasnik) {
        await this.glasoviService.ukloniGlasove(
          manager,
          stanarId,
          zgradaId,
          veza.stan.id,
          false,
        );
      }
      await manager.update(StanarStana, id, { vlasnik: dto.vlasnik });
      return { id, vlasnik: dto.vlasnik };
    });
  }

  async remove(zgradaId: number, id: number, korisnikId: number, uloga: Uloga) {
    await this.proveriUpravnika(zgradaId, korisnikId, uloga);

    await this.dataSource.transaction(async (manager) => {
      const { veza, stanarId, ostajeUZgradi } = await this.zakljucajVezu(
        manager,
        zgradaId,
        id,
      );
      await this.odseli(manager, stanarId, zgradaId, veza, ostajeUZgradi);
    });
  }

  async odseliIzSvihStanova(manager: EntityManager, korisnikId: number) {
    const veze = await manager.find(StanarStana, {
      where: { korisnik: { id: korisnikId } },
      relations: { stan: { zgrada: true } },
      select: { id: true, stan: { id: true, zgrada: { id: true } } },
    });
    for (const zgradaId of new Set(veze.map((v) => v.stan.zgrada.id))) {
      const uZgradi = await zakljucajVeze(
        manager,
        korisnikId,
        zgradaId,
        'pessimistic_write',
      );
      for (const [i, veza] of uZgradi.entries()) {
        await this.odseli(
          manager,
          korisnikId,
          zgradaId,
          veza,
          i < uZgradi.length - 1,
        );
      }
    }
  }

  private async odseli(
    manager: EntityManager,
    korisnikId: number,
    zgradaId: number,
    veza: Pick<StanarStana, 'id' | 'stan'>,
    ostajeUZgradi: boolean,
  ) {
    await manager.delete(StanarStana, veza.id);
    await this.glasoviService.ukloniGlasove(
      manager,
      korisnikId,
      zgradaId,
      veza.stan.id,
      !ostajeUZgradi,
    );
    if (!ostajeUZgradi) {
      await this.pracenjaService.ukloniPracenja(manager, korisnikId, zgradaId);
      const upravlja = await manager.existsBy(Korisnik, {
        id: korisnikId,
        zgrada: { id: zgradaId },
      });
      if (!upravlja) {
        await this.oglasService.sakrijOglase(
          manager,
          { autor: { id: korisnikId }, zgrada: { id: zgradaId } },
          'Autor se odselio iz zgrade.',
        );
      }
    }
  }

  private async proveriUpravnika(
    zgradaId: number,
    korisnikId: number,
    uloga: Uloga,
  ) {
    await this.korisnikService.proveriUpravnikaZgrade(
      korisnikId,
      uloga,
      zgradaId,
      'Stanare uređuje samo upravnik ove zgrade!',
    );
  }

  private async zakljucajStanara(
    manager: EntityManager,
    korisnikId: number,
    zgradaId: number,
  ) {
    await manager.findOne(Korisnik, {
      where: { id: korisnikId },
      select: { id: true },
      lock: { mode: 'pessimistic_read' },
    });
    return await zakljucajVeze(
      manager,
      korisnikId,
      zgradaId,
      'pessimistic_write',
    );
  }

  private async zakljucajVezu(
    manager: EntityManager,
    zgradaId: number,
    id: number,
  ) {
    const nadjena = await manager.findOne(StanarStana, {
      where: { id, stan: { zgrada: { id: zgradaId } } },
      relations: { korisnik: true },
      select: { id: true, korisnik: { id: true } },
    });
    const veze = nadjena
      ? await this.zakljucajStanara(manager, nadjena.korisnik.id, zgradaId)
      : [];
    const veza = veze.find((v) => v.id === id);
    if (!nadjena || !veza) {
      throw new NotFoundException(
        `Stanar sa id-jem ${id} ne postoji u ovoj zgradi!`,
      );
    }
    return {
      veza,
      stanarId: nadjena.korisnik.id,
      ostajeUZgradi: veze.length > 1,
    };
  }
}
