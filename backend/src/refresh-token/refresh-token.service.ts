import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { RefreshToken } from './refresh-token.entity.js';
import { generisiToken } from './refresh-token.util.js';
import { hesirajToken } from './refresh-token.util.js';

const MS_PO_DANU = 24 * 60 * 60 * 1000;

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private config: ConfigService,
  ) {}

  async kreiraj(korisnik: Korisnik, porodicaId: string = randomUUID()) {
    const token = generisiToken();
    const trajanjeDana = Number(this.config.get('REFRESH_TOKEN_TTL_DANI') ?? 7);
    const datumIsteka = new Date(Date.now() + trajanjeDana * MS_PO_DANU);

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

    const { token: noviToken, datumIsteka } = await this.kreiraj(
      zapis.korisnik,
      zapis.porodicaId,
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
}
