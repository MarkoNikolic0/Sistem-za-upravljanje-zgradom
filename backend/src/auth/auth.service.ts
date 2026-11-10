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
import { PORUKA_DEAKTIVIRAN, PORUKA_ZAKLJUCAN } from './auth.constants.js';
import { NeuspelePrijaveService } from './neuspele-prijave/neuspele-prijave.service.js';

const LAZNI_HES = bcrypt.hashSync('lozinka-za-isto-vreme-odgovora', 10);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
    private neuspelePrijaveService: NeuspelePrijaveService,
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

  async login(dto: LoginDto, ip: string) {
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
    if (await this.neuspelePrijaveService.zakljucan(korisnik.id, ip)) {
      throw new HttpException(PORUKA_ZAKLJUCAN, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!lozinkaValidna) {
      const zakljucan = await this.neuspelePrijaveService.zabelezi(
        korisnik.id,
        ip,
      );
      throw zakljucan
        ? new HttpException(PORUKA_ZAKLJUCAN, HttpStatus.TOO_MANY_REQUESTS)
        : new UnauthorizedException('Neispravan email ili lozinka.');
    }
    await this.neuspelePrijaveService.obrisi(korisnik.id, ip);
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
}
