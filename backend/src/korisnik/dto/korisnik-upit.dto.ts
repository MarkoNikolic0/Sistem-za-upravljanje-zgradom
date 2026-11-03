import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Uloga } from '../../shared/enums/uloga.enum.js';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';

export class KorisnikUpitDto {
  @UkloniRazmake()
  @IsString()
  @MaxLength(100, { message: 'Pretraga može imati najviše 100 znakova.' })
  @MinLength(2, { message: 'Unesi najmanje 2 slova.' })
  @IsNotEmpty({ message: 'Unesi ime, prezime ili email.' })
  pretraga: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? [value] : value,
  )
  @IsEnum(Uloga, { each: true })
  uloga?: Uloga[];
}
