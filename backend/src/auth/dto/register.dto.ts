import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
} from 'class-validator';
import { PravilaLozinke } from '../decorators/pravila-lozinke.decorator.js';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  ime: string;

  @IsString()
  @IsNotEmpty()
  prezime: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsPhoneNumber('RS', { message: 'Broj telefona nije ispravan.' })
  @IsNotEmpty()
  telefon: string;

  @PravilaLozinke()
  lozinka: string;
}
