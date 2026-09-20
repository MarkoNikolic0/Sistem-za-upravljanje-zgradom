import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { Repository } from 'typeorm/browser/repository/Repository.js';
import { RegisterDto } from './dto/register.dto.js';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto.js';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const postojeciKorisnik = await this.korisnikRepository.findOne({
      where: { email: dto.email },
    });

    if (postojeciKorisnik) {
      throw new ConflictException('Korisnik sa ovim emailom već postoji');
    }

    const hesiranaLozinka = await bcrypt.hash(dto.lozinka, 10);

    const noviKorisnik = this.korisnikRepository.create({
      ime: dto.ime,
      prezime: dto.prezime,
      email: dto.email,
      lozinka: hesiranaLozinka,
    });

    const sacuvanKorsnik = await this.korisnikRepository.save(noviKorisnik);

    const { lozinka, ...rezultat } = sacuvanKorsnik;
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
    const token = await this.jwtService.signAsync(payload);

    return { access_token: token };
  }
}
