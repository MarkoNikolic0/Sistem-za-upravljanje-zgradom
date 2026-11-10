import { IsEmail, IsNotEmpty } from 'class-validator';
import { NormalizujEmail } from '../../shared/normalizuj-email.js';

export class ZaboravljenaLozinkaDto {
  @IsEmail({}, { message: 'Email adresa nije ispravna.' })
  @IsNotEmpty({ message: 'Unesi email adresu.' })
  @NormalizujEmail()
  email: string;
}
