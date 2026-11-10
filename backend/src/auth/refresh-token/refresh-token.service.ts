import { Injectable, UnauthorizedException } from '@nestjs/common';
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

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private config: ConfigService,
  ) {}

  async kreiraj(
    korisnik: Korisnik,
    porodicaId: string = randomUUID(),
    datumIsteka: Date = this.noviDatumIsteka(),
  ) {
    const token = generisiToken();

    const zapis = this.refreshTokenRepository.create({
      tokenHash: hesirajToken(token),
      porodicaId,
      datumIsteka,
      korisnik,
    });
    await this.refreshTokenRepository.save(zapis);

    return { token, datumIsteka };
  }

  async rotiraj(token: string) {
    const tokenHash = hesirajToken(token);
    const sada = new Date();

    const rezultat = await this.refreshTokenRepository.update(
      { tokenHash, datumOpoziva: IsNull(), datumIsteka: MoreThan(sada) },
      { datumOpoziva: sada },
    );

    if (rezultat.affected === 0) {
      const postojeci = await this.refreshTokenRepository.findOne({
        where: { tokenHash },
      });
      if (postojeci?.datumOpoziva) {
        await this.opozoviPorodicu(postojeci.porodicaId);
      }
      throw new UnauthorizedException('Nevažeća sesija.');
    }

    const zapis = await this.refreshTokenRepository.findOneOrFail({
      where: { tokenHash },
      relations: { korisnik: true },
    });
    if (zapis.korisnik.deaktiviran) {
      await this.opozoviPorodicu(zapis.porodicaId);
      throw new UnauthorizedException('Nevažeća sesija.');
    }

    const { token: noviToken, datumIsteka } = await this.kreiraj(
      zapis.korisnik,
      zapis.porodicaId,
      zapis.datumIsteka,
    );

    return { korisnik: zapis.korisnik, noviToken, datumIsteka };
  }

  async opozoviPorodicu(porodicaId: string) {
    await this.refreshTokenRepository.update(
      { porodicaId, datumOpoziva: IsNull() },
      { datumOpoziva: new Date() },
    );
  }

  async opozoviPoTokenu(token: string) {
    const zapis = await this.refreshTokenRepository.findOne({
      where: { tokenHash: hesirajToken(token) },
    });
    if (zapis) {
      await this.opozoviPorodicu(zapis.porodicaId);
    }
  }

  async opozoviOstaleSesije(
    manager: EntityManager,
    korisnikId: number,
    token: string | undefined,
  ) {
    const trenutna = token
      ? await manager.findOne(RefreshToken, {
          where: {
            tokenHash: hesirajToken(token),
            korisnik: { id: korisnikId },
          },
        })
      : null;

    await manager.update(
      RefreshToken,
      {
        korisnik: { id: korisnikId },
        datumOpoziva: IsNull(),
        ...(trenutna && { porodicaId: Not(trenutna.porodicaId) }),
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

  private noviDatumIsteka(): Date {
    const trajanjeDana = Number(this.config.get('REFRESH_TOKEN_TTL_DANI') ?? 7);
    return new Date(Date.now() + trajanjeDana * MS_PO_DANU);
  }
}
