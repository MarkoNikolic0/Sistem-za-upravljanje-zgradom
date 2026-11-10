import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { Repository } from 'typeorm';
import { RegisterDto } from './dto/register.dto.js';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto.js';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token/refresh-token.service.js';
import { parsePhoneNumberWithError } from 'libphonenumber-js/min';
import {
  MAKS_NEUSPELIH_PRIJAVA,
  PORUKA_DEAKTIVIRAN,
  PORUKA_ZAKLJUCAN,
  ZAKLJUCAVANJE_MIN,
} from './auth.constants.js';

const LAZNI_HES = bcrypt.hashSync('lozinka-za-isto-vreme-odgovora', 10);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async register(dto: RegisterDto) {
    const postojeciKorisnik = await this.korisnikRepository.findOne({
      where: { email: dto.email },
    });

    if (postojeciKorisnik) {
      throw new ConflictException('Nalog sa ovom email adresom već postoji.');
    }

    const hesiranaLozinka = await bcrypt.hash(dto.lozinka, 10);

    const noviKorisnik = this.korisnikRepository.create({
      ime: dto.ime,
      prezime: dto.prezime,
      email: dto.email,
      telefon: parsePhoneNumberWithError(dto.telefon, 'RS').number,
      lozinka: hesiranaLozinka,
    });

    const sacuvanKorisnik = await this.korisnikRepository.save(noviKorisnik);

    const { lozinka: _lozinka, ...rezultat } = sacuvanKorisnik;
    return rezultat;
  }

  async login(dto: LoginDto) {
    const korisnik = await this.korisnikRepository.findOne({
      where: { email: dto.email },
    });
    const lozinkaValidna = await bcrypt.compare(
      dto.lozinka,
      korisnik?.lozinka ?? LAZNI_HES,
    );
    if (!korisnik) {
      throw new UnauthorizedException('Neispravan email ili lozinka.');
    }
    if (korisnik.zakljucanDo && korisnik.zakljucanDo > new Date()) {
      throw new HttpException(PORUKA_ZAKLJUCAN, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!lozinkaValidna) {
      throw await this.zabeleziNeuspeh(korisnik.id);
    }
    if (korisnik.neuspelePrijave > 0 || korisnik.zakljucanDo) {
      await this.korisnikRepository.update(korisnik.id, {
        neuspelePrijave: 0,
        zakljucanDo: null,
      });
    }
    if (korisnik.deaktiviran) {
      throw new ForbiddenException(PORUKA_DEAKTIVIRAN);
    }

    const payload = {
      sub: korisnik.id,
      email: korisnik.email,
      uloga: korisnik.uloga,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    const { token: refreshToken, datumIsteka } =
      await this.refreshTokenService.kreiraj(korisnik);

    return { accessToken, refreshToken, datumIsteka };
  }

  async refresh(refreshToken: string) {
    const { korisnik, noviToken, datumIsteka } =
      await this.refreshTokenService.rotiraj(refreshToken);

    const payload = {
      sub: korisnik.id,
      email: korisnik.email,
      uloga: korisnik.uloga,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken, refreshToken: noviToken, datumIsteka };
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) {
      return;
    }
    await this.refreshTokenService.opozoviPoTokenu(refreshToken);
  }

  private async zabeleziNeuspeh(korisnikId: number): Promise<HttpException> {
    const prag = `"neuspelePrijave" + 1 >= ${MAKS_NEUSPELIH_PRIJAVA}`;
    const { raw } = await this.korisnikRepository
      .createQueryBuilder()
      .update(Korisnik)
      .set({
        neuspelePrijave: () =>
          `CASE WHEN ${prag} THEN 0 ELSE "neuspelePrijave" + 1 END`,
        zakljucanDo: () =>
          `CASE WHEN ${prag} THEN now() + interval '${ZAKLJUCAVANJE_MIN} minutes' ELSE "zakljucanDo" END`,
      })
      .where('id = :korisnikId', { korisnikId })
      .returning('"zakljucanDo"')
      .execute();

    const zakljucanDo = (raw as { zakljucanDo: Date | null }[])[0]?.zakljucanDo;
    return zakljucanDo
      ? new HttpException(PORUKA_ZAKLJUCAN, HttpStatus.TOO_MANY_REQUESTS)
      : new UnauthorizedException('Neispravan email ili lozinka.');
  }
}
