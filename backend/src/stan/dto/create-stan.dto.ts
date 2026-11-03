import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';

export class PodaciStanaDto {
  @UkloniRazmake()
  @IsString()
  @MaxLength(10, { message: 'Broj stana može imati najviše 10 znakova.' })
  @IsNotEmpty({ message: 'Unesi broj stana.' })
  broj: string;

  @Max(99, { message: 'Sprat može biti najviše 99.' })
  @Min(-5, { message: 'Sprat može biti najmanje -5.' })
  @IsInt({ message: 'Sprat mora biti ceo broj.' })
  sprat: number;

  @Max(10000, { message: 'Kvadratura može biti najviše 10000 m².' })
  @Min(1, { message: 'Kvadratura mora biti najmanje 1 m².' })
  @IsInt({ message: 'Kvadratura mora biti ceo broj.' })
  kvadratura: number;
}

export class CreateStanDto extends PodaciStanaDto {
  @IsInt()
  zgradaId: number;
}
