import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { VrstaOglasa } from '../../shared/enums/vrsta-oglasa.enum.js';
import { StranicenjeDto } from '../../shared/stranicenje.js';

export class OglasUpitDto extends StranicenjeDto {
  @IsOptional()
  @IsEnum(VrstaOglasa)
  vrsta?: VrstaOglasa;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  zgradaId?: number;
}
