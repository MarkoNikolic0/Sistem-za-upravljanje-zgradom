import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { Repository } from 'typeorm';
import { RegisterDto } from './dto/register.dto.js';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto.js';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from '../refresh-token/refresh-token.service.js';
import { parsePhoneNumberWithError } from 'libphonenumber-js/min';
import { greskaPolja } from '../shared/greske-validacije.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

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
      throw new ConflictException('Korisnik sa ovim emailom vec postoji');
    }

    const hesiranaLozinka = await bcrypt.hash(dto.lozinka, 10);

    const noviKorisnik = this.korisnikRepository.create({
      ime: dto.ime,
      prezime: dto.prezime,
      email: dto.email,
      telefon: parsePhoneNumberWithError(dto.telefon, 'RS').number,
      lozinka: hesiranaLozinka,
    });

    const sacuvanKorsnik = await this.korisnikRepository.save(noviKorisnik);

    const { lozinka: _lozinka, ...rezultat } = sacuvanKorsnik;
    return rezultat;
  }

  async login(dto: LoginDto) {
    const korisnik = await this.korisnikRepository.findOne({
      where: { email: dto.email },
    });
    if (!korisnik) {
      throw new UnauthorizedException('Neispravan email ili lozinka');
    }

    const lozinkaValidna = await bcrypt.compare(dto.lozinka, korisnik.lozinka);
    if (!lozinkaValidna) {
      throw new UnauthorizedException('Neispravan email ili lozinka');
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

  async promeniLozinku(
    korisnikId: number,
    dto: ChangePasswordDto,
    refreshToken: string | undefined,
  ) {
    const korisnik = await this.korisnikRepository.findOne({
      where: { id: korisnikId },
    });
    if (!korisnik) {
      throw new NotFoundException('Korisnik ne postoji.');
    }

    const trenutnaIspravna = await bcrypt.compare(
      dto.trenutnaLozinka,
      korisnik.lozinka,
    );
    if (!trenutnaIspravna) {
      throw greskaPolja('trenutnaLozinka', 'Trenutna lozinka nije ispravna.');
    }

    const istaKaoStara = await bcrypt.compare(
      dto.novaLozinka,
      korisnik.lozinka,
    );
    if (istaKaoStara) {
      throw greskaPolja(
        'novaLozinka',
        'Nova lozinka mora biti drugačija od trenutne.',
      );
    }

    korisnik.lozinka = await bcrypt.hash(dto.novaLozinka, 10);
    await this.korisnikRepository.save(korisnik);

    await this.refreshTokenService.opozoviOstaleSesije(
      korisnikId,
      refreshToken,
    );
  }
}
