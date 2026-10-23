import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { PrilogOglasa } from './prilog-oglasa.entity.js';
import { Oglas } from './oglas.entity.js';
import { greskaPolja } from '../shared/greske-validacije.js';
import { SkladisteService } from '../shared/skladiste/skladiste.service.js';
import { obradiSliku } from '../shared/skladiste/obrada-slike.js';
import {
  MAKS_NAZIV_PRILOGA,
  MAKS_PRILOGA_PO_OGLASU,
  PORUKA_SAKRIVEN,
} from './oglas.constants.js';

const PDF = 'application/pdf';

// Ime sa uređaja služi samo za prikaz; u skladištu fajl dobija nov ključ.
function nazivZaPrikaz(originalno: string) {
  const ime = originalno
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .split(/[\\/]/)
    .pop()!
    .trim();
  return Array.from(ime || 'prilog')
    .slice(0, MAKS_NAZIV_PRILOGA)
    .join('');
}

@Injectable()
export class PrilogOglasaService {
  constructor(
    @InjectRepository(PrilogOglasa)
    private prilogRepository: Repository<PrilogOglasa>,
    private skladiste: SkladisteService,
    private dataSource: DataSource,
  ) {}

  async dodaj(oglasId: number, fajl: Express.Multer.File | undefined) {
    if (!fajl) {
      throw greskaPolja('prilog', 'Izaberi fajl.');
    }

    const osnova = `oglasi/${oglasId}/${randomUUID()}`;
    const naziv = nazivZaPrikaz(fajl.originalname);
    let prilog: Omit<PrilogOglasa, 'id' | 'oglas' | 'datumOtpremanja'>;
    if (fajl.mimetype === PDF) {
      prilog = {
        kljuc: `${osnova}.pdf`,
        kljucSlicice: null,
        naziv,
        tip: PDF,
        velicina: fajl.size,
      };
      await this.skladiste.sacuvaj(prilog.kljuc, fajl.buffer, PDF);
    } else {
      const [velika, slicica] = await obradiSliku(fajl.buffer, 'prilog');
      const kljucSlicice = `${osnova}-slicica.webp`;
      prilog = {
        kljuc: `${osnova}.webp`,
        kljucSlicice,
        naziv,
        tip: 'image/webp',
        velicina: velika.length,
      };
      await Promise.all([
        this.skladiste.sacuvaj(prilog.kljuc, velika, prilog.tip),
        this.skladiste.sacuvaj(kljucSlicice, slicica, prilog.tip),
      ]);
    }

    try {
      const sacuvan = await this.dataSource.transaction(async (manager) => {
        const oglas = await manager.findOne(Oglas, {
          where: { id: oglasId },
          select: { id: true, datumSakrivanja: true },
          lock: { mode: 'pessimistic_write' },
        });
        if (!oglas) {
          throw new NotFoundException(`Oglas sa id-jem ${oglasId} ne postoji!`);
        }
        if (oglas.datumSakrivanja !== null) {
          throw new ConflictException(PORUKA_SAKRIVEN);
        }
        const broj = await manager.count(PrilogOglasa, {
          where: { oglas: { id: oglasId } },
        });
        if (broj >= MAKS_PRILOGA_PO_OGLASU) {
          throw greskaPolja(
            'prilog',
            `Oglas može imati najviše ${MAKS_PRILOGA_PO_OGLASU} priloga.`,
          );
        }
        return await manager.save(
          manager.create(PrilogOglasa, { ...prilog, oglas: { id: oglasId } }),
        );
      });
      return (await this.saLinkovima([sacuvan]))[0];
    } catch (greska) {
      await this.obrisiFajlove([prilog]);
      throw greska;
    }
  }

  async obrisi(prilog: PrilogOglasa) {
    await this.prilogRepository.delete(prilog.id);
    await this.obrisiFajlove([prilog]);
  }

  async obrisiFajlove(prilozi: Pick<PrilogOglasa, 'kljuc' | 'kljucSlicice'>[]) {
    const kljucevi = prilozi.flatMap((p) =>
      p.kljucSlicice ? [p.kljuc, p.kljucSlicice] : [p.kljuc],
    );
    if (kljucevi.length > 0) {
      await this.skladiste.obrisi(...kljucevi);
    }
  }

  saLinkovima(prilozi: PrilogOglasa[]) {
    return Promise.all(
      prilozi.map(async (prilog) => {
        const [url, urlSlicice] = await Promise.all([
          this.skladiste.link(
            prilog.kljuc,
            prilog.tip === PDF ? prilog.naziv : undefined,
          ),
          prilog.kljucSlicice && this.skladiste.link(prilog.kljucSlicice),
        ]);
        return Object.assign(prilog, { url, urlSlicice });
      }),
    );
  }
}
