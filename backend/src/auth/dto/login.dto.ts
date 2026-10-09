import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { NormalizujEmail } from '../../shared/normalizuj-email.js';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  @NormalizujEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  lozinka: string;
}
