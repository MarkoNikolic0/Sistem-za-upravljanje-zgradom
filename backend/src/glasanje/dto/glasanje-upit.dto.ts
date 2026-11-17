import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { StanjeGlasanja } from '../../shared/enums/glasanje.enums.js';
import { StranicenjeDto } from '../../shared/stranicenje.js';

export class GlasanjeUpitDto extends StranicenjeDto {
  @IsEnum(StanjeGlasanja)
  stanje: StanjeGlasanja = StanjeGlasanja.AKTIVNA;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  zgradaId?: number;
}
