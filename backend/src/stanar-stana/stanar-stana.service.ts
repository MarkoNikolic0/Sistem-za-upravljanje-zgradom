import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StanarStana } from './stanar-stana.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { sadrzi } from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';

const redosled = new Intl.Collator('sr', { numeric: true });

@Injectable()
export class StanarStanaService {
  constructor(
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
    private korisnikService: KorisnikService,
  ) {}

  async findAll(zgradaId: number, korisnikId: number, uloga: Uloga) {
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    if (!sadrzi(p.upravlja, zgradaId)) {
      throw new ForbiddenException('Stanare vidi samo upravnik ove zgrade!');
    }
    if (!(await this.zgradaRepository.existsBy({ id: zgradaId }))) {
      throw new NotFoundException(`Zgrada sa id-jem ${zgradaId} ne postoji!`);
    }

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

    return stanovi
      .sort((a, b) => a.sprat - b.sprat || redosled.compare(a.broj, b.broj))
      .map(({ id, broj, sprat }) => ({
        id,
        broj,
        sprat,
        stanari: veze
          .filter((v) => v.stan.id === id)
          .map((v) => ({ id: v.id, vlasnik: v.vlasnik, korisnik: v.korisnik })),
      }));
  }
}
