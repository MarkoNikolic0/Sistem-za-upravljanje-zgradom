import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { NormalizujEmail } from '../../shared/normalizuj-email.js';

export class LoginDto {
  @IsEmail({}, { message: 'Email adresa nije ispravna.' })
  @IsNotEmpty({ message: 'Unesi email adresu.' })
  @NormalizujEmail()
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Unesi lozinku.' })
  lozinka: string;
}
