import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { SlikaKvara } from './slika-kvara.entity.js';
import { KvarService } from '../kvar/kvar.service.js';
import { KvarPravaService } from '../kvar/kvar-prava.service.js';
import { Kvar } from '../kvar/kvar.entity.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { StatusKvara } from '../shared/enums/kvar.enums.js';
import { greskaPolja } from '../shared/greske-validacije.js';
import { SkladisteService } from '../shared/skladiste/skladiste.service.js';
import { obradiSliku } from '../shared/skladiste/obrada-slike.js';
import { MAKS_SLIKA_PO_KVARU } from './slika-kvara.constants.js';
import { jeZavrsen } from '../kvar/kvar.constants.js';

@Injectable()
export class SlikaKvaraService {
  constructor(
    @InjectRepository(SlikaKvara)
    private slikaRepository: Repository<SlikaKvara>,
    private kvarService: KvarService,
    private kvarPravaService: KvarPravaService,
    private skladiste: SkladisteService,
    private dataSource: DataSource,
  ) {}

  async findZaKvar(kvarId: number, korisnikId: number, uloga: Uloga) {
    await this.kvarService.findDostupan(kvarId, korisnikId, uloga);

    const slike = await this.slikaRepository.find({
      where: { kvar: { id: kvarId } },
      relations: { korisnik: true },
      order: { datumOtpremanja: 'ASC', id: 'ASC' },
    });
    return await Promise.all(slike.map((slika) => this.saLinkovima(slika)));
  }

  async create(
    kvarId: number,
    korisnikId: number,
    uloga: Uloga,
    fajl: Express.Multer.File | undefined,
  ) {
    if (!fajl) {
      throw greskaPolja('slika', 'Izaberi sliku.');
    }
    const kvar = await this.kvarService.findDostupan(kvarId, korisnikId, uloga);
    this.proveriDaNijeZavrsen(kvar.status);

    const [velika, slicica] = await obradiSliku(fajl.buffer, 'slika');
    const osnova = `kvarovi/${kvar.id}/${randomUUID()}`;
    const kljuc = `${osnova}.webp`;
    const kljucSlicice = `${osnova}-slicica.webp`;
    await Promise.all([
      this.skladiste.sacuvaj(kljuc, velika, 'image/webp'),
      this.skladiste.sacuvaj(kljucSlicice, slicica, 'image/webp'),
    ]);

    let id: number;
    try {
      id = await this.dataSource.transaction(async (manager) => {
        const zakljucan = await manager.findOneOrFail(Kvar, {
          where: { id: kvar.id },
          select: { id: true, status: true },
          lock: { mode: 'pessimistic_write' },
        });
        this.proveriDaNijeZavrsen(zakljucan.status);
        const broj = await manager.count(SlikaKvara, {
          where: { kvar: { id: kvar.id } },
        });
        if (broj >= MAKS_SLIKA_PO_KVARU) {
          throw greskaPolja(
            'slika',
            `Kvar može imati najviše ${MAKS_SLIKA_PO_KVARU} slika.`,
          );
        }
        const { identifiers } = await manager.insert(SlikaKvara, {
          kljuc,
          kljucSlicice,
          kvar: { id: kvar.id },
          korisnik: { id: korisnikId },
        });
        return identifiers[0].id as number;
      });
    } catch (greska) {
      await this.skladiste.obrisi(kljuc, kljucSlicice);
      throw greska;
    }

    const slika = await this.slikaRepository.findOneOrFail({
      where: { id },
      relations: { korisnik: true },
    });
    return await this.saLinkovima(slika);
  }

  private proveriDaNijeZavrsen(status: StatusKvara) {
    if (jeZavrsen(status)) {
      throw new ConflictException(
        'Kvar je završen, pa više ne mogu da se dodaju slike.',
      );
    }
  }

  async remove(
    kvarId: number,
    id: number,
    korisnikId: number,
    uloga: Uloga,
  ): Promise<void> {
    const slika = await this.slikaRepository.findOne({
      where: { id, kvar: { id: kvarId } },
      relations: { korisnik: true, kvar: { zgrada: true } },
    });
    if (!slika) {
      throw new NotFoundException(`Slika sa id-jem ${id} ne postoji!`);
    }

    if (
      !(await this.kvarPravaService.smeDaUpravlja(
        slika.kvar,
        korisnikId,
        uloga,
      ))
    ) {
      if (slika.korisnik?.id !== korisnikId) {
        throw new ForbiddenException('Možete brisati samo svoje slike!');
      }
      if (jeZavrsen(slika.kvar.status)) {
        throw new ConflictException(
          'Kvar je završen, pa slike više ne mogu da se brišu.',
        );
      }
    }
    await this.slikaRepository.remove(slika);
    await this.skladiste.obrisi(slika.kljuc, slika.kljucSlicice);
  }

  private async saLinkovima(slika: SlikaKvara) {
    const [url, urlSlicice] = await Promise.all([
      this.skladiste.link(slika.kljuc),
      this.skladiste.link(slika.kljucSlicice),
    ]);
    return Object.assign(slika, { url, urlSlicice });
  }
}
