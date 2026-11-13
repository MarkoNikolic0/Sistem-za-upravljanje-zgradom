import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Raw, Repository } from 'typeorm';
import { Oglas } from './oglas.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { uZgradama } from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { vidljivSvima } from './oglas.constants.js';

@Injectable()
export class OglasProcitanoService {
  constructor(
    @InjectRepository(Oglas) private oglasRepository: Repository<Oglas>,
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
    private korisnikService: KorisnikService,
  ) {}

  async brojNeprocitanih(korisnikId: number, uloga: Uloga) {
    const [{ oglasiProcitaniDo: procitanoDo }, p] = await Promise.all([
      this.korisnikRepository.findOneOrFail({
        where: { id: korisnikId },
        select: { id: true, oglasiProcitaniDo: true },
      }),
      this.korisnikService.pristupZgradama(korisnikId, uloga),
    ]);
    if (p.zgrade.length === 0) {
      return { broj: 0, procitanoDo };
    }
    const broj = await this.oglasRepository.countBy({
      ...uZgradama(p.zgrade),
      ...vidljivSvima(),
      autor: { id: Not(korisnikId) },
      datumKreiranja: Raw(
        (kolona) =>
          `${kolona} > (SELECT "oglasiProcitaniDo" FROM korisnik WHERE id = :korisnikId)`,
        { korisnikId },
      ),
    });
    return { broj, procitanoDo };
  }

  async procitajSve(korisnikId: number): Promise<void> {
    await this.korisnikRepository.update(korisnikId, {
      oglasiProcitaniDo: () => 'now()',
    });
  }
}
