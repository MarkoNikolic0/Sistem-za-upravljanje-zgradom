import { IsEmail, IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';
import { PravilaLozinke } from '../decorators/pravila-lozinke.decorator.js';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';
import { NormalizujEmail } from '../../shared/normalizuj-email.js';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Unesi ime.' })
  @UkloniRazmake()
  ime: string;

  @IsString()
  @IsNotEmpty({ message: 'Unesi prezime.' })
  @UkloniRazmake()
  prezime: string;

  @IsEmail({}, { message: 'Email adresa nije ispravna.' })
  @IsNotEmpty({ message: 'Unesi email adresu.' })
  @NormalizujEmail()
  email: string;

  @IsPhoneNumber('RS', { message: 'Broj telefona nije ispravan.' })
  @IsNotEmpty({ message: 'Unesi broj telefona.' })
  telefon: string;

  @PravilaLozinke()
  lozinka: string;
}
