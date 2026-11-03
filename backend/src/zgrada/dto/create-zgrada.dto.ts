import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';

export class CreateZgradaDto {
  @UkloniRazmake()
  @IsString()
  @MaxLength(100, { message: 'Naziv može imati najviše 100 znakova.' })
  @IsNotEmpty({ message: 'Unesi naziv zgrade.' })
  naziv: string;

  @UkloniRazmake()
  @IsString()
  @MaxLength(200, { message: 'Adresa može imati najviše 200 znakova.' })
  @IsNotEmpty({ message: 'Unesi adresu.' })
  adresa: string;
}
