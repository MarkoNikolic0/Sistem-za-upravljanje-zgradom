import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';
import { PravilaLozinke } from '../decorators/pravila-lozinke.decorator.js';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';
import { NormalizujEmail } from '../../shared/normalizuj-email.js';

export class RegisterDto {
  @IsString()
  @MaxLength(50, { message: 'Ime može imati najviše 50 znakova.' })
  @IsNotEmpty({ message: 'Unesi ime.' })
  @UkloniRazmake()
  ime: string;

  @IsString()
  @MaxLength(50, { message: 'Prezime može imati najviše 50 znakova.' })
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
