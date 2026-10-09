import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  KategorijaKvara,
  LokacijaTip,
  Prioritet,
} from '../../shared/enums/kvar.enums.js';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';

export class CreateKvarDto {
  @UkloniRazmake()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  naslov: string;

  @UkloniRazmake()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  opis: string;

  @IsEnum(KategorijaKvara)
  @IsNotEmpty()
  kategorija: KategorijaKvara;

  @IsOptional()
  @IsEnum(Prioritet)
  prioritet?: Prioritet;

  @IsEnum(LokacijaTip)
  @IsNotEmpty()
  lokacijaTip: LokacijaTip;

  @IsInt()
  @IsPositive()
  stanId: number;
}
