import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxDate,
  MaxLength,
  MinDate,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';
import { MS_PO_DANU } from '../../shared/vreme.js';
import {
  VecinaOdluke,
  VrstaGlasanja,
} from '../../shared/enums/glasanje.enums.js';

export const MAKS_OPCIJA = 10;
export const MAKS_DANA_ROKA = 30;

export class CreateGlasanjeDto {
  @IsEnum(VrstaGlasanja, { message: 'Izaberi vrstu glasanja.' })
  vrsta: VrstaGlasanja = VrstaGlasanja.ANKETA;

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

  @ValidateIf((dto: CreateGlasanjeDto) => dto.vrsta === VrstaGlasanja.ANKETA)
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
  opcije?: string[];

  @ValidateIf((dto: CreateGlasanjeDto) => dto.vrsta === VrstaGlasanja.ODLUKA)
  @IsEnum(VecinaOdluke, { message: 'Izaberi potrebnu većinu.' })
  vecina?: VecinaOdluke;

  // Rok je kraj izabranog dana u zoni korisnika, pa server dopušta dva dana više
  @MaxDate(() => new Date(Date.now() + (MAKS_DANA_ROKA + 2) * MS_PO_DANU), {
    message: `Rok može biti najviše ${MAKS_DANA_ROKA} dana unapred.`,
  })
  @MinDate(() => new Date(), { message: 'Rok mora biti u budućnosti.' })
  @IsDate({ message: 'Unesi rok za glasanje.' })
  @Type(() => Date)
  rok: Date;

  @IsInt()
  @IsPositive()
  zgradaId: number;
}
