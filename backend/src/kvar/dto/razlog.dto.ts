import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';

export class RazlogDto {
  @UkloniRazmake()
  @IsString()
  @MaxLength(1000, { message: 'Razlog može imati najviše 1000 znakova.' })
  @IsNotEmpty({ message: 'Napiši razlog.' })
  tekst: string;
}

export class OpcioniRazlogDto {
  @UkloniRazmake()
  @IsString()
  @MaxLength(1000, { message: 'Razlog može imati najviše 1000 znakova.' })
  @IsOptional()
  tekst?: string;
}
