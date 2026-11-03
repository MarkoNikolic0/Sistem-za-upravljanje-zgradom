import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Korisnik } from '../../korisnik/korisnik.entity.js';
import { AKTIVAN_KORISNIK } from '../../korisnik/aktivan-korisnik.js';
import type { TrenutniKorisnikPodaci } from '../decorators/trenutni-korisnik.decorator.js';

// Sadrzaj access tokena (postavlja ga AuthService pri prijavi i osvezavanju)
interface JwtPayload {
  sub: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  // Uloga se cita iz baze, pa promena uloge i deaktivacija vaze odmah
  async validate(payload: JwtPayload): Promise<TrenutniKorisnikPodaci> {
    const korisnik = await this.korisnikRepository.findOne({
      where: { id: payload.sub, ...AKTIVAN_KORISNIK },
      select: { id: true, email: true, uloga: true },
    });
    if (!korisnik) {
      throw new UnauthorizedException();
    }
    return { id: korisnik.id, email: korisnik.email, uloga: korisnik.uloga };
  }
}
