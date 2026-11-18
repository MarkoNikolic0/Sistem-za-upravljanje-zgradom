import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, Not, In } from 'typeorm';
import { ServiserSpecijalnost } from './serviser-specijalnost.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { AKTIVAN_KORISNIK } from '../korisnik/aktivan-korisnik.js';
import { PostaviSpecijalnostiDto } from './dto/postavi-specijalnosti.dto.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { KategorijaKvara } from '../shared/enums/kvar.enums.js';
import { nePostoji } from '../shared/ne-postoji.js';

@Injectable()
export class ServiserSpecijalnostService {
  constructor(private dataSource: DataSource) {}

  async postavi(korisnikId: number, { kategorije }: PostaviSpecijalnostiDto) {
    return await this.dataSource.transaction(async (manager) => {
      const korisnik = await manager.findOne(Korisnik, {
        where: { id: korisnikId, ...AKTIVAN_KORISNIK },
        select: { id: true, uloga: true },
        lock: { mode: 'for_no_key_update' },
      });
      if (!korisnik) {
        throw nePostoji('Korisnik', korisnikId);
      }
      if (korisnik.uloga !== Uloga.SERVISER) {
        throw new BadRequestException('Struke se dodeljuju samo serviseru.');
      }
      await manager.delete(ServiserSpecijalnost, {
        korisnik: { id: korisnikId },
        kategorija: Not(In(kategorije)),
      });
      if (kategorije.length > 0) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(ServiserSpecijalnost)
          .values(
            kategorije.map((kategorija) => ({
              korisnik: { id: korisnikId },
              kategorija,
            })),
          )
          .orIgnore()
          .execute();
      }
      return {
        kategorije: Object.values(KategorijaKvara).filter((k) =>
          kategorije.includes(k),
        ),
      };
    });
  }
}
