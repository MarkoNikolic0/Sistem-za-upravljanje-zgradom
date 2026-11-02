import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StanarStana } from './stanar-stana.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { poRedosleduStanova } from '../stan/redosled-stanova.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { Uloga } from '../shared/enums/uloga.enum.js';

@Injectable()
export class StanarStanaService {
  constructor(
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    private korisnikService: KorisnikService,
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
        select: { id: true, broj: true, sprat: true },
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
    return stanovi.sort(poRedosleduStanova).map(({ id, broj, sprat }) => ({
      id,
      broj,
      sprat,
      stanari: stanariStana.get(id) ?? [],
    }));
  }
}
