import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto.js';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token/refresh-token.service.js';
import { PORUKA_PRIJAVA, PORUKA_ZAKLJUCAN } from './auth.constants.js';
import { NeuspelePrijaveService } from './neuspele-prijave/neuspele-prijave.service.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';
import { PushService } from '../notifikacija/push/push.service.js';

export interface NovaSesija {
  accessToken: string;
  refreshToken: string;
  datumIsteka: Date;
}

const LAZNI_HES = bcrypt.hashSync('lozinka-za-isto-vreme-odgovora', 10);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
    private neuspelePrijaveService: NeuspelePrijaveService,
    private pushService: PushService,
  ) {}

  async login(dto: LoginDto, ip: string): Promise<NovaSesija> {
    const korisnik = await this.korisnikRepository.findOne({
      where: { email: dto.email },
    });
    const lozinkaValidna = await bcrypt.compare(
      dto.lozinka,
      korisnik?.lozinka ?? LAZNI_HES,
    );
    if (await this.neuspelePrijaveService.zakljucan(dto.email, ip)) {
      throw new HttpException(PORUKA_ZAKLJUCAN, HttpStatus.TOO_MANY_REQUESTS);
    }
    const dozvoljen =
      korisnik?.emailPotvrdjen && !korisnik.deaktiviran && lozinkaValidna;
    if (!dozvoljen) {
      const zakljucan = await this.neuspelePrijaveService.zabelezi(
        dto.email,
        ip,
      );
      throw zakljucan
        ? new HttpException(PORUKA_ZAKLJUCAN, HttpStatus.TOO_MANY_REQUESTS)
        : new UnauthorizedException(PORUKA_PRIJAVA);
    }
    await this.neuspelePrijaveService.obrisi(dto.email, ip);

    const {
      token: refreshToken,
      datumIsteka,
      porodicaId,
    } = await this.refreshTokenService.kreiraj(korisnik);
    const accessToken = await this.accessToken(korisnik, porodicaId);

    return { accessToken, refreshToken, datumIsteka };
  }

  async refresh(refreshToken: string): Promise<NovaSesija> {
    const { korisnik, noviToken, datumIsteka, porodicaId } =
      await this.refreshTokenService.rotiraj(refreshToken);
    const accessToken = await this.accessToken(korisnik, porodicaId);

    return { accessToken, refreshToken: noviToken, datumIsteka };
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) {
      return;
    }
    const porodicaId =
      await this.refreshTokenService.opozoviPoTokenu(refreshToken);
    if (porodicaId) {
      await this.pushService.obrisiSesiju(porodicaId);
    }
  }

  private accessToken(korisnik: Korisnik, porodicaId: string) {
    const payload: JwtPayload = {
      sub: korisnik.id,
      email: korisnik.email,
      uloga: korisnik.uloga,
      sid: porodicaId,
    };
    return this.jwtService.signAsync(payload);
  }
}
