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
  @IsString({ message: 'Unesi kratak naslov.' })
  @MaxLength(100, { message: 'Naslov može imati najviše 100 znakova.' })
  @IsNotEmpty({ message: 'Unesi kratak naslov.' })
  naslov: string;

  @UkloniRazmake()
  @IsString({ message: 'Opiši kvar.' })
  @MaxLength(2000, { message: 'Opis može imati najviše 2000 znakova.' })
  @IsNotEmpty({ message: 'Opiši kvar.' })
  opis: string;

  @IsEnum(KategorijaKvara, { message: 'Izaberi vrstu kvara.' })
  kategorija: KategorijaKvara;

  @IsOptional()
  @IsEnum(Prioritet, { message: 'Izaberi prioritet.' })
  prioritet?: Prioritet;

  @IsEnum(LokacijaTip, { message: 'Izaberi mesto kvara.' })
  lokacijaTip: LokacijaTip;

  @IsInt({ message: 'Izaberi stan.' })
  @IsPositive({ message: 'Izaberi stan.' })
  stanId: number;
}
