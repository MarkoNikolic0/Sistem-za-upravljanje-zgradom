import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Kvar } from './kvar.entity.js';
import { LokacijaTip, StatusKvara } from '../shared/enums/kvar.enums.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { PORUKA_PRACENJE } from './kvar.constants.js';
import { uZgradama } from '../korisnik/pristup-zgradama.js';

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
  ): Promise<FindOptionsWhere<Kvar>[]> {
    switch (uloga) {
      case Uloga.ADMIN:
        return [uZgradama(zgradaId ? [zgradaId] : null)];

      case Uloga.UPRAVNIK: {
        const zgradaUpravnika =
          await this.korisnikService.zgradaUpravnika(korisnikId);
        const uslovi = await this.usloviStanara(korisnikId);
        return zgradaUpravnika === null
          ? uslovi
          : [{ zgrada: { id: zgradaUpravnika } }, ...uslovi];
      }

      case Uloga.SERVISER:
        return [
          {
            serviser: { id: korisnikId },
            ...uZgradama(zgradaId ? [zgradaId] : null),
          },
        ];

      default:
        return await this.usloviStanara(korisnikId);
    }
  }

  private async usloviStanara(
    korisnikId: number,
  ): Promise<FindOptionsWhere<Kvar>[]> {
    const veze = await this.stanarStanaRepository.find({
      where: { korisnik: { id: korisnikId } },
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
          (await this.korisnikService.zgradaUpravnika(korisnikId)) ===
            kvar.zgrada.id || (await this.smeKaoStanar(kvar, korisnikId))
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
    const zgradaUpravnika =
      await this.korisnikService.zgradaUpravnika(korisnikId);
    return zgradaUpravnika === kvar.zgrada.id;
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
