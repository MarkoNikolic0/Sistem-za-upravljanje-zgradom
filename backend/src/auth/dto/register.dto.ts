import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
} from 'class-validator';
import { PravilaLozinke } from '../decorators/pravila-lozinke.decorator.js';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';
import { NormalizujEmail } from '../../shared/normalizuj-email.js';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @UkloniRazmake()
  ime: string;

  @IsString()
  @IsNotEmpty()
  @UkloniRazmake()
  prezime: string;

  @IsEmail()
  @IsNotEmpty()
  @NormalizujEmail()
  email: string;

  @IsPhoneNumber('RS', { message: 'Broj telefona nije ispravan.' })
  @IsNotEmpty()
  telefon: string;

  @PravilaLozinke()
  lozinka: string;
}
