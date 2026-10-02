import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Uloga } from '../../shared/enums/uloga.enum.js';

// Ulogovani korisnik, onako kako ga JwtStrategy.validate postavlja na req.user
export interface TrenutniKorisnikPodaci {
  id: number;
  email: string;
  uloga: Uloga;
}

// Daje ulogovanog korisnika u kontroleru, umesto rucnog citanja req.user
export const TrenutniKorisnik = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TrenutniKorisnikPodaci =>
    ctx.switchToHttp().getRequest().user,
);
