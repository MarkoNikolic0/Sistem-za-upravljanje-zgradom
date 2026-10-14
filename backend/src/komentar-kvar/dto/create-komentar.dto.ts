import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';

export class CreateKomentarDto {
  @IsInt()
  @IsNotEmpty()
  kvarId: number;

  @UkloniRazmake()
  @IsString()
  @MaxLength(1000, { message: 'Komentar može imati najviše 1000 znakova.' })
  @IsNotEmpty({ message: 'Napiši komentar.' })
  tekst: string;
}
