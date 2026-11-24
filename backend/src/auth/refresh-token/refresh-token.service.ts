import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import {
  EntityManager,
  IsNull,
  LessThan,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { Korisnik } from '../../korisnik/korisnik.entity.js';
import { RefreshToken } from './refresh-token.entity.js';
import { generisiToken, hesirajToken } from '../token.util.js';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MS_PO_DANU } from '../../shared/vreme.js';
import { NotifikacijaService } from '../../notifikacija/notifikacija.service.js';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private config: ConfigService,
    private notifikacije: NotifikacijaService,
  ) {}

  kreiraj(korisnik: Korisnik) {
    return this.upisi(
      this.refreshTokenRepository.manager,
      korisnik,
      randomUUID(),
      this.noviDatumIsteka(),
    );
  }

  async rotiraj(token: string) {
    const tokenHash = hesirajToken(token);

    const rotacija = await this.refreshTokenRepository.manager.transaction(
      async (manager) => {
        const sada = new Date();
        const { affected } = await manager.update(
          RefreshToken,
          { tokenHash, datumOpoziva: IsNull(), datumIsteka: MoreThan(sada) },
          { datumOpoziva: sada },
        );
        if (!affected) {
          return null;
        }

        const zapis = await manager.findOneOrFail(RefreshToken, {
          where: { tokenHash },
          relations: { korisnik: true },
        });
        if (zapis.korisnik.deaktiviran) {
          return null;
        }

        const { token: noviToken, datumIsteka } = await this.upisi(
          manager,
          zapis.korisnik,
          zapis.porodicaId,
          zapis.datumIsteka,
        );
        return {
          korisnik: zapis.korisnik,
          noviToken,
          datumIsteka,
          porodicaId: zapis.porodicaId,
        };
      },
    );

    if (!rotacija) {
      const postojeci = await this.refreshTokenRepository.findOne({
        where: { tokenHash },
      });
      if (postojeci?.datumOpoziva) {
        this.logger.warn(
          `Ponovo upotrebljen stari kolačić sesije, sesija ${postojeci.porodicaId} je ugašena.`,
        );
        await this.opozoviPorodicu(postojeci.porodicaId);
      }
      throw new UnauthorizedException('Nevažeća sesija.');
    }
    return rotacija;
  }

  async opozoviPorodicu(porodicaId: string) {
    await this.refreshTokenRepository.update(
      { porodicaId, datumOpoziva: IsNull() },
      { datumOpoziva: new Date() },
    );
    this.notifikacije.prekiniSesiju(porodicaId);
  }

  async opozoviPoTokenu(token: string): Promise<string | undefined> {
    const zapis = await this.refreshTokenRepository.findOne({
      where: { tokenHash: hesirajToken(token) },
    });
    if (zapis) {
      await this.opozoviPorodicu(zapis.porodicaId);
    }
    return zapis?.porodicaId;
  }

  async opozoviOstaleSesije(
    manager: EntityManager,
    korisnikId: number,
    trenutnaPorodicaId: string,
  ) {
    await manager.update(
      RefreshToken,
      {
        korisnik: { id: korisnikId },
        datumOpoziva: IsNull(),
        porodicaId: Not(trenutnaPorodicaId),
      },
      { datumOpoziva: new Date() },
    );
  }

  async opozoviSveSesije(manager: EntityManager, korisnikId: number) {
    await manager.update(
      RefreshToken,
      { korisnik: { id: korisnikId }, datumOpoziva: IsNull() },
      { datumOpoziva: new Date() },
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async obrisiIstekle() {
    await this.refreshTokenRepository.delete({
      datumIsteka: LessThan(new Date()),
    });
  }

  private async upisi(
    manager: EntityManager,
    korisnik: Korisnik,
    porodicaId: string,
    datumIsteka: Date,
  ) {
    const token = generisiToken();
    await manager.insert(RefreshToken, {
      tokenHash: hesirajToken(token),
      porodicaId,
      datumIsteka,
      korisnik,
    });
    return { token, datumIsteka, porodicaId };
  }

  private noviDatumIsteka(): Date {
    const trajanjeDana = Number(this.config.get('REFRESH_TOKEN_TTL_DANI') ?? 7);
    return new Date(Date.now() + trajanjeDana * MS_PO_DANU);
  }
}
