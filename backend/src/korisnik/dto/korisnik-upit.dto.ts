import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { StanjeNaloga, Uloga } from '../../shared/enums/uloga.enum.js';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';
import { StranicenjeDto } from '../../shared/stranicenje.js';

export class KorisnikUpitDto extends StranicenjeDto {
  @IsOptional()
  @UkloniRazmake()
  @IsString()
  @MaxLength(100, { message: 'Pretraga može imati najviše 100 znakova.' })
  @MinLength(2, { message: 'Unesi najmanje 2 slova.' })
  pretraga?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? [value] : value,
  )
  @IsEnum(Uloga, { each: true })
  uloga?: Uloga[];

  @IsEnum(StanjeNaloga)
  stanje: StanjeNaloga = StanjeNaloga.AKTIVNI;
}
