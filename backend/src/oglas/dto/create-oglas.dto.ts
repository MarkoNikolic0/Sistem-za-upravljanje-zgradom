import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { VrstaOglasa } from '../../shared/enums/vrsta-oglasa.enum.js';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';

export class CreateOglasDto {
  @UkloniRazmake()
  @IsString()
  @MaxLength(100, { message: 'Naslov može imati najviše 100 znakova.' })
  @IsNotEmpty({ message: 'Unesi kratak naslov.' })
  naslov: string;

  @UkloniRazmake()
  @IsString()
  @MaxLength(2000, { message: 'Tekst može imati najviše 2000 znakova.' })
  @IsNotEmpty({ message: 'Napiši tekst oglasa.' })
  tekst: string;

  @IsEnum(VrstaOglasa, { message: 'Izaberi vrstu oglasa.' })
  vrsta: VrstaOglasa;

  @IsInt()
  @IsPositive()
  zgradaId: number;
}
