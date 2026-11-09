import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { Sastanak } from './sastanak.entity.js';
import { DokumentZgrade } from '../dokument-zgrade/dokument-zgrade.entity.js';
import { DokumentZgradeService } from '../dokument-zgrade/dokument-zgrade.service.js';
import { SkladisteService } from '../shared/skladiste/skladiste.service.js';
import { type PristupZgradama, sadrzi } from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { KategorijaDokumenta } from '../shared/enums/dokument.enums.js';
import { VrstaSastanka } from '../shared/enums/sastanak.enums.js';
import { SAMO_ZGRADA, SastanakPravaService } from './sastanak-prava.service.js';

const PORUKA_NIJE_ODRZAN = 'Zapisnik se kači kad sednica počne.';

export function smeDaOkaciZapisnik(sastanak: Sastanak, p: PristupZgradama) {
  return (
    sadrzi(p.upravlja, sastanak.zgrada.id) &&
    sastanak.datumOtkazivanja === null &&
    sastanak.pocetak <= new Date()
  );
}

@Injectable()
export class ZapisnikSastankaService {
  constructor(
    @InjectRepository(DokumentZgrade)
    private dokumentRepository: Repository<DokumentZgrade>,
    private dokumenti: DokumentZgradeService,
    private skladiste: SkladisteService,
    private prava: SastanakPravaService,
  ) {}

  async zapisnik(sastanakId: number) {
    const dokument = await this.dokumentRepository.findOneBy({ sastanakId });
    return dokument && (await this.dokumenti.saLinkom(dokument));
  }

  async okaci(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    naziv: string,
    fajl: Express.Multer.File | undefined,
  ) {
    const { sastanak } = await this.prava.findZaUpravljanje(
      id,
      korisnikId,
      uloga,
      SAMO_ZGRADA,
    );
    if (sastanak.datumOtkazivanja !== null) {
      throw new ConflictException('Sastanak je otkazan.');
    }
    if (sastanak.pocetak > new Date()) {
      throw new ConflictException(PORUKA_NIJE_ODRZAN);
    }

    const stariKljuc = await this.dokumenti.sacuvajSaFajlom(
      sastanak.zgrada.id,
      fajl,
      async (manager, sacuvan) => {
        await this.zakljucajOdrzan(manager, id);
        const stari = await manager.findOne(DokumentZgrade, {
          where: { sastanakId: id },
          select: { id: true, kljuc: true },
        });
        if (stari) {
          await manager.delete(DokumentZgrade, stari.id);
        }
        await manager.insert(DokumentZgrade, {
          naziv,
          kategorija: KategorijaDokumenta.ZAPISNIK,
          samoVlasnici: sastanak.vrsta === VrstaSastanka.SKUPSTINA,
          ...sacuvan,
          zgrada: { id: sastanak.zgrada.id },
          sastanakId: id,
        });
        return stari?.kljuc ?? null;
      },
    );
    if (stariKljuc) {
      await this.skladiste.obrisi(stariKljuc);
    }
  }

  async ukloni(id: number, korisnikId: number, uloga: Uloga) {
    await this.prava.findZaUpravljanje(id, korisnikId, uloga, SAMO_ZGRADA);
    const kljuc = await this.dokumentRepository.manager.transaction(
      async (manager) => {
        await manager.findOne(Sastanak, {
          where: { id },
          select: { id: true },
          lock: { mode: 'pessimistic_write' },
        });
        const zapisnik = await manager.findOne(DokumentZgrade, {
          where: { sastanakId: id },
          select: { id: true, kljuc: true },
        });
        if (!zapisnik) {
          throw new NotFoundException('Sastanak nema okačen zapisnik.');
        }
        await manager.delete(DokumentZgrade, zapisnik.id);
        return zapisnik.kljuc;
      },
    );
    await this.skladiste.obrisi(kljuc);
  }

  private async zakljucajOdrzan(manager: EntityManager, id: number) {
    const odrzan = await manager.findOne(Sastanak, {
      where: {
        id,
        pocetak: LessThanOrEqual(new Date()),
        datumOtkazivanja: IsNull(),
      },
      select: { id: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!odrzan) {
      throw new ConflictException(PORUKA_NIJE_ODRZAN);
    }
  }
}
