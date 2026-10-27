import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
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
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';
import { MS_PO_DANU } from '../../shared/vreme.js';
import { VrstaSastanka } from '../../shared/enums/sastanak.enums.js';

export const MAKS_TACAKA = 20;
export const MAKS_DANA_UNAPRED = 365;

export class TackaDto {
  @UkloniRazmake()
  @IsString()
  @MaxLength(200, { message: 'Tačka može imati najviše 200 znakova.' })
  @IsNotEmpty({ message: 'Popuni svaku tačku ili je ukloni.' })
  naslov: string;

  @IsOptional()
  @UkloniRazmake()
  @IsString()
  @MaxLength(1000, { message: 'Opis tačke može imati najviše 1000 znakova.' })
  opis?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  odlukaId?: number;
}

export class CreateSastanakDto {
  @IsEnum(VrstaSastanka, { message: 'Izaberi vrstu sastanka.' })
  vrsta: VrstaSastanka;

  @UkloniRazmake()
  @IsString()
  @MaxLength(200, { message: 'Naslov može imati najviše 200 znakova.' })
  @IsNotEmpty({ message: 'Unesi naslov.' })
  naslov: string;

  @IsOptional()
  @UkloniRazmake()
  @IsString()
  @MaxLength(1000, { message: 'Opis može imati najviše 1000 znakova.' })
  opis?: string;

  @MaxDate(() => new Date(Date.now() + MAKS_DANA_UNAPRED * MS_PO_DANU), {
    message: 'Sastanak može biti najviše godinu dana unapred.',
  })
  @MinDate(() => new Date(), { message: 'Termin mora biti u budućnosti.' })
  @IsDate({ message: 'Unesi datum i vreme.' })
  @Type(() => Date)
  pocetak: Date;

  @UkloniRazmake()
  @IsString()
  @MaxLength(200, { message: 'Mesto može imati najviše 200 znakova.' })
  @IsNotEmpty({ message: 'Unesi mesto održavanja.' })
  lokacija: string;

  // Bez podrazumevane vrednosti: PartialType bi je preneo u izmenu i tiho skidao oznaku
  @IsOptional()
  @IsBoolean()
  hitno?: boolean;

  @ValidateNested({ each: true })
  @Type(() => TackaDto)
  @ArrayMaxSize(MAKS_TACAKA, {
    message: `Dnevni red može imati najviše ${MAKS_TACAKA} tačaka.`,
  })
  @ArrayMinSize(1, { message: 'Dodaj bar jednu tačku dnevnog reda.' })
  @IsArray({ message: 'Dodaj bar jednu tačku dnevnog reda.' })
  tacke: TackaDto[];

  @IsInt()
  @IsPositive()
  zgradaId: number;
}
