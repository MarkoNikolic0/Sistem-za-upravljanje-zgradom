import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Kvar } from './kvar.entity.js';
import { LokacijaTip } from '../shared/enums/kvar.enums.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';

@Injectable()
export class KvarPravaService {
  constructor(
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    private korisnikService: KorisnikService,
  ) {}

  async usloviVidljivosti(
    korisnikId: number,
    uloga: Uloga,
    zgradaId?: number,
  ): Promise<FindOptionsWhere<Kvar>[]> {
    switch (uloga) {
      case Uloga.ADMIN:
        return [zgradaId ? { zgrada: { id: zgradaId } } : {}];

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
            ...(zgradaId ? { zgrada: { id: zgradaId } } : {}),
          },
        ];

      default:
        return await this.usloviStanara(korisnikId);
    }
  }

  private async usloviStanara(
    korisnikId: number,
  ): Promise<FindOptionsWhere<Kvar>[]> {
    const sopstveni: FindOptionsWhere<Kvar> = { korisnik: { id: korisnikId } };
    const veze = await this.stanarStanaRepository.find({
      where: { korisnik: { id: korisnikId } },
      relations: { stan: { zgrada: true } },
    });
    if (veze.length === 0) {
      return [sopstveni];
    }
    const stanIds = veze.map((v) => v.stan.id);
    const zgradaIds = [...new Set(veze.map((v) => v.stan.zgrada.id))];
    return [
      { stan: { id: In(stanIds) } },
      {
        zgrada: { id: In(zgradaIds) },
        lokacijaTip: LokacijaTip.ZAJEDNICKI_PROSTOR,
      },
      sopstveni,
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

  private async smeKaoStanar(kvar: Kvar, korisnikId: number): Promise<boolean> {
    if (kvar.korisnik.id === korisnikId) {
      return true;
    }
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

  async proveriUpravljanje(kvar: Kvar, korisnikId: number, uloga: Uloga) {
    if (!(await this.smeDaUpravlja(kvar, korisnikId, uloga))) {
      throw new ForbiddenException(
        'Možete upravljati samo kvarovima svoje zgrade!',
      );
    }
  }

  async proveriPracenje(kvar: Kvar, korisnikId: number) {
    if (!(await this.smeDaPrati(kvar, korisnikId))) {
      throw new ForbiddenException(
        'Kvar u zajedničkom prostoru prate stanari zgrade koji ga nisu prijavili!',
      );
    }
  }

  proveriServisera(kvar: Kvar, korisnikId: number) {
    if (kvar.serviser?.id !== korisnikId) {
      throw new ForbiddenException(
        'Samo dodeljeni serviser može da radi na ovom kvaru!',
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
