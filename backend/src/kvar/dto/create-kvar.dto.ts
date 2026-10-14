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
  @MaxLength(100, { message: 'Naslov može imati najviše 100 znakova.' })
  @IsNotEmpty({ message: 'Unesi kratak naslov.' })
  naslov: string;

  @UkloniRazmake()
  @IsString()
  @MaxLength(2000, { message: 'Opis može imati najviše 2000 znakova.' })
  @IsNotEmpty({ message: 'Opiši kvar.' })
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
