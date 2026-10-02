import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Uloga } from '../../shared/enums/uloga.enum.js';
import type { TrenutniKorisnikPodaci } from '../decorators/trenutni-korisnik.decorator.js';

// Sadrzaj access tokena (postavlja ga AuthService pri prijavi i osvezavanju)
interface JwtPayload {
  sub: number;
  email: string;
  uloga: Uloga;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  // Vrednost koju vrati validate postaje req.user (cita je @TrenutniKorisnik)
  async validate(payload: JwtPayload): Promise<TrenutniKorisnikPodaci> {
    return { id: payload.sub, email: payload.email, uloga: payload.uloga };
  }
}
