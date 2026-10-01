import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

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

  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  lozinka: string;
}
