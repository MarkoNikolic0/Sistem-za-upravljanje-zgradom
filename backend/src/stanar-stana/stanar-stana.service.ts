import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { StanarStana } from './stanar-stana.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { poRedosleduStanova } from '../stan/redosled-stanova.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { GlasanjeGlasoviService } from '../glasanje/glasanje-glasovi.service.js';
import { PratilacKvaraService } from '../pratilac-kvara/pratilac-kvara.service.js';
import { zakljucajVeze } from './veze-u-zgradi.js';
import { UpdateStanarStanaDto } from './dto/update-stanar-stana.dto.js';

@Injectable()
export class StanarStanaService {
  constructor(
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    private korisnikService: KorisnikService,
    private glasoviService: GlasanjeGlasoviService,
    private pracenjaService: PratilacKvaraService,
    private dataSource: DataSource,
  ) {}

  async findAll(zgradaId: number, korisnikId: number, uloga: Uloga) {
    await this.korisnikService.proveriUpravnikaZgrade(
      korisnikId,
      uloga,
      zgradaId,
      'Stanare vidi samo upravnik ove zgrade!',
    );

    const [stanovi, veze] = await Promise.all([
      this.stanRepository.find({
        where: { zgrada: { id: zgradaId } },
        select: { id: true, broj: true, sprat: true, kvadratura: true },
      }),
      this.stanarStanaRepository.find({
        where: { stan: { zgrada: { id: zgradaId } } },
        relations: { korisnik: true, stan: true },
        select: {
          id: true,
          vlasnik: true,
          stan: { id: true },
          korisnik: {
            id: true,
            ime: true,
            prezime: true,
            email: true,
            telefon: true,
          },
        },
        order: {
          vlasnik: 'DESC',
          korisnik: { prezime: 'ASC', ime: 'ASC' },
        },
      }),
    ]);

    const stanariStana = new Map<
      number,
      Pick<StanarStana, 'id' | 'vlasnik' | 'korisnik'>[]
    >();
    for (const v of veze) {
      const stanari = stanariStana.get(v.stan.id) ?? [];
      stanari.push({ id: v.id, vlasnik: v.vlasnik, korisnik: v.korisnik });
      stanariStana.set(v.stan.id, stanari);
    }
    return stanovi
      .sort(poRedosleduStanova)
      .map(({ id, broj, sprat, kvadratura }) => ({
        id,
        broj,
        sprat,
        kvadratura,
        stanari: stanariStana.get(id) ?? [],
      }));
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
      await manager.delete(StanarStana, id);
      await this.glasoviService.ukloniGlasove(
        manager,
        stanarId,
        zgradaId,
        veza.stan.id,
        !ostajeUZgradi,
      );
      if (!ostajeUZgradi) {
        await this.pracenjaService.ukloniPracenja(manager, stanarId, zgradaId);
      }
    });
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
      ? await zakljucajVeze(
          manager,
          nadjena.korisnik.id,
          zgradaId,
          'pessimistic_write',
        )
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
