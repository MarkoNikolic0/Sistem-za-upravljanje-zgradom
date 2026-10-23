import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';

export class CreateKomentarDto {
  @UkloniRazmake()
  @IsString()
  @MaxLength(1000, { message: 'Komentar može imati najviše 1000 znakova.' })
  @IsNotEmpty({ message: 'Napiši komentar.' })
  tekst: string;
}
