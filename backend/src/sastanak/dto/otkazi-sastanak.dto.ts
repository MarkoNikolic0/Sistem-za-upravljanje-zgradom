import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';

export class OtkaziSastanakDto {
  @UkloniRazmake()
  @IsString()
  @MaxLength(1000, { message: 'Razlog može imati najviše 1000 znakova.' })
  @IsNotEmpty({ message: 'Napiši razlog otkazivanja.' })
  razlog: string;
}
