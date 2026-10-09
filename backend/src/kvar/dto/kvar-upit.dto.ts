import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { StanjeKvara } from '../../shared/enums/kvar.enums.js';
import { StranicenjeDto } from '../../shared/stranicenje.js';

export class KvarUpitDto extends StranicenjeDto {
  @IsEnum(StanjeKvara)
  stanje: StanjeKvara = StanjeKvara.AKTIVNI;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  zgradaId?: number;
}
