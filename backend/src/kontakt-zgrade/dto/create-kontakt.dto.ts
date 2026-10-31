import {
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';

export class CreateKontaktDto {
  @UkloniRazmake()
  @IsString()
  @MaxLength(100, { message: 'Naziv može imati najviše 100 znakova.' })
  @IsNotEmpty({ message: 'Unesi naziv.' })
  naziv: string;

  @UkloniRazmake()
  @IsString()
  @MaxLength(60, { message: 'Uloga može imati najviše 60 znakova.' })
  @IsNotEmpty({ message: 'Unesi ulogu.' })
  uloga: string;

  @IsPhoneNumber('RS', { message: 'Broj telefona nije ispravan.' })
  @IsNotEmpty({ message: 'Unesi broj telefona.' })
  telefon: string;
}
