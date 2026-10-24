import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';

export const MAKS_OPCIJA = 10;

export class CreateGlasanjeDto {
  @UkloniRazmake()
  @IsString()
  @MaxLength(200, { message: 'Pitanje može imati najviše 200 znakova.' })
  @IsNotEmpty({ message: 'Unesi pitanje.' })
  pitanje: string;

  @IsOptional()
  @UkloniRazmake()
  @IsString()
  @MaxLength(1000, { message: 'Opis može imati najviše 1000 znakova.' })
  opis?: string;

  @UkloniRazmake()
  @ArrayUnique(
    (opcija: unknown) =>
      typeof opcija === 'string' ? opcija.toLocaleLowerCase('sr') : opcija,
    { message: 'Opcije moraju biti različite.' },
  )
  @MaxLength(100, {
    each: true,
    message: 'Opcija može imati najviše 100 znakova.',
  })
  @IsNotEmpty({ each: true, message: 'Popuni svaku opciju ili je ukloni.' })
  @IsString({ each: true })
  @ArrayMaxSize(MAKS_OPCIJA, {
    message: `Anketa može imati najviše ${MAKS_OPCIJA} opcija.`,
  })
  @ArrayMinSize(2, { message: 'Dodaj bar dve opcije.' })
  @IsArray({ message: 'Dodaj bar dve opcije.' })
  opcije: string[];

  @MinDate(() => new Date(), { message: 'Rok mora biti u budućnosti.' })
  @IsDate({ message: 'Unesi rok za glasanje.' })
  @Type(() => Date)
  rok: Date;

  @IsInt()
  @IsPositive()
  zgradaId: number;
}
