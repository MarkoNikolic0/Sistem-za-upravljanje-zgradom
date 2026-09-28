import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
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
}