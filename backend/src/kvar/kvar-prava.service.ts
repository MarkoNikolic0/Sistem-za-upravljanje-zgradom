import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Kvar } from './kvar.entity.js';
import { LokacijaTip, StatusKvara } from '../shared/enums/kvar.enums.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { PORUKA_PRACENJE } from './kvar.constants.js';
import { sadrzi, samoZgrada, uZgradama } from '../korisnik/pristup-zgradama.js';

export function vidiKontakte(
  zgradeSaKontaktima: number[] | null,
  zgradaId: number,
): boolean {
  return zgradeSaKontaktima === null || sadrzi(zgradeSaKontaktima, zgradaId);
}

@Injectable()
export class KvarPravaService {
  constructor(
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    private korisnikService: KorisnikService,
  ) {}

  // Prazan niz znači da korisnik ne vidi nijedan kvar
  async usloviVidljivosti(
    korisnikId: number,
    uloga: Uloga,
    zgradaId?: number,
  ): Promise<{
    uslovi: FindOptionsWhere<Kvar>[];
    zgradeSaKontaktima: number[] | null;
  }> {
    switch (uloga) {
      case Uloga.ADMIN:
        return {
          uslovi: [uZgradama(zgradaId ? [zgradaId] : null)],
          zgradeSaKontaktima: null,
        };

      case Uloga.UPRAVNIK: {
        const upravlja = await this.korisnikService.zgradeUpravnika(korisnikId);
        const zgrade = samoZgrada(upravlja, zgradaId);
        const uslovi = await this.usloviStanara(korisnikId, zgradaId);
        return {
          uslovi: zgrade.length === 0 ? uslovi : [uZgradama(zgrade), ...uslovi],
          zgradeSaKontaktima: upravlja,
        };
      }

      case Uloga.SERVISER:
        return {
          uslovi: [
            {
              serviser: { id: korisnikId },
              ...uZgradama(zgradaId ? [zgradaId] : null),
            },
          ],
          zgradeSaKontaktima: null,
        };

      default:
        return {
          uslovi: await this.usloviStanara(korisnikId, zgradaId),
          zgradeSaKontaktima: null,
        };
    }
  }

  private async usloviStanara(
    korisnikId: number,
    zgradaId?: number,
  ): Promise<FindOptionsWhere<Kvar>[]> {
    const veze = await this.stanarStanaRepository.find({
      where: {
        korisnik: { id: korisnikId },
        ...(zgradaId !== undefined && { stan: { zgrada: { id: zgradaId } } }),
      },
      relations: { stan: { zgrada: true } },
    });
    if (veze.length === 0) {
      return [];
    }
    const stanIds = veze.map((v) => v.stan.id);
    const zgradaIds = [...new Set(veze.map((v) => v.stan.zgrada.id))];
    return [
      { stan: { id: In(stanIds) } },
      {
        zgrada: { id: In(zgradaIds) },
        lokacijaTip: LokacijaTip.ZAJEDNICKI_PROSTOR,
      },
    ];
  }

  async smeDaVidi(
    kvar: Kvar,
    korisnikId: number,
    uloga: Uloga,
  ): Promise<boolean> {
    switch (uloga) {
      case Uloga.ADMIN:
        return true;

      case Uloga.UPRAVNIK:
        return (
          sadrzi(
            await this.korisnikService.zgradeUpravnika(korisnikId),
            kvar.zgrada.id,
          ) || (await this.smeKaoStanar(kvar, korisnikId))
        );

      case Uloga.SERVISER:
        return kvar.serviser?.id === korisnikId;

      case Uloga.STANAR:
        return await this.smeKaoStanar(kvar, korisnikId);

      default:
        return false;
    }
  }

  // Po trenutnom stanu: ko se odselio, ne vidi ni kvarove koje je sam prijavio
  private async smeKaoStanar(kvar: Kvar, korisnikId: number): Promise<boolean> {
    if (kvar.stan) {
      return await this.stanarStanaRepository.exists({
        where: { korisnik: { id: korisnikId }, stan: { id: kvar.stan.id } },
      });
    }
    return await this.stanujeUZgradi(kvar, korisnikId);
  }

  async stanujeUZgradi(kvar: Kvar, korisnikId: number): Promise<boolean> {
    return await this.stanarStanaRepository.exists({
      where: {
        korisnik: { id: korisnikId },
        stan: { zgrada: { id: kvar.zgrada.id } },
      },
    });
  }

  async smeDaPrati(kvar: Kvar, korisnikId: number): Promise<boolean> {
    return (
      kvar.lokacijaTip === LokacijaTip.ZAJEDNICKI_PROSTOR &&
      kvar.korisnik.id !== korisnikId &&
      (await this.stanujeUZgradi(kvar, korisnikId))
    );
  }

  async smeDaUpravlja(
    kvar: Kvar,
    korisnikId: number,
    uloga: Uloga,
  ): Promise<boolean> {
    if (uloga === Uloga.ADMIN) {
      return true;
    }
    if (uloga !== Uloga.UPRAVNIK) {
      return false;
    }
    return sadrzi(
      await this.korisnikService.zgradeUpravnika(korisnikId),
      kvar.zgrada.id,
    );
  }

  async zgradeSaKontaktima(
    korisnikId: number,
    uloga: Uloga,
  ): Promise<number[] | null> {
    return uloga === Uloga.UPRAVNIK
      ? await this.korisnikService.zgradeUpravnika(korisnikId)
      : null;
  }

  async skrivaKontakte(
    zgradaId: number,
    korisnikId: number,
    uloga: Uloga,
  ): Promise<boolean> {
    return !vidiKontakte(
      await this.zgradeSaKontaktima(korisnikId, uloga),
      zgradaId,
    );
  }

  async smeDaPotvrdi(kvar: Kvar, korisnikId: number): Promise<boolean> {
    if (kvar.stan) {
      return await this.stanarStanaRepository.exists({
        where: { korisnik: { id: korisnikId }, stan: { id: kvar.stan.id } },
      });
    }
    return kvar.korisnik.id === korisnikId;
  }

  smeDaPovuce(kvar: Kvar, korisnikId: number): boolean {
    return (
      kvar.korisnik.id === korisnikId &&
      kvar.status === StatusKvara.PRIJAVLJEN &&
      kvar.brojPratilaca === 0
    );
  }

  async proveriUpravljanje(kvar: Kvar, korisnikId: number, uloga: Uloga) {
    if (!(await this.smeDaUpravlja(kvar, korisnikId, uloga))) {
      throw new ForbiddenException(
        'Možete upravljati samo kvarovima svoje zgrade!',
      );
    }
  }

  async proveriPracenje(kvar: Kvar, korisnikId: number) {
    if (!(await this.smeDaPrati(kvar, korisnikId))) {
      throw new ForbiddenException(PORUKA_PRACENJE);
    }
  }

  proveriServisera(kvar: Kvar, korisnikId: number) {
    if (kvar.serviser?.id !== korisnikId) {
      throw new ForbiddenException(
        'Samo dodeljeni serviser može da radi na ovom kvaru!',
      );
    }
  }

  proveriPovlacenje(kvar: Kvar, korisnikId: number) {
    if (kvar.korisnik.id !== korisnikId) {
      throw new ForbiddenException(
        'Prijavu može da povuče samo onaj ko je prijavio kvar!',
      );
    }
  }

  async proveriPotvrdu(kvar: Kvar, korisnikId: number) {
    if (!(await this.smeDaPotvrdi(kvar, korisnikId))) {
      throw new ForbiddenException(
        'Rešenje potvrđuje neko iz stana, a za zajednički prostor onaj ko je prijavio kvar!',
      );
    }
  }
}
