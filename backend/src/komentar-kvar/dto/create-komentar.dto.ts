import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UkloniRazmake } from '../../shared/ukloni-razmake.js';

export class CreateKomentarDto {
  @IsInt()
  @IsNotEmpty()
  kvarId: number;

  @UkloniRazmake()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  tekst: string;
}
