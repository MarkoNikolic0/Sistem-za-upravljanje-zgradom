import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional } from 'class-validator';
import { StanjeSastanka } from '../../shared/enums/sastanak.enums.js';
import { StranicenjeDto } from '../../shared/stranicenje.js';
import { KaoBoolean } from '../../shared/kao-boolean.js';

export class SastanakUpitDto extends StranicenjeDto {
  @IsEnum(StanjeSastanka)
  stanje: StanjeSastanka = StanjeSastanka.PREDSTOJECI;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  zgradaId?: number;

  @IsOptional()
  @KaoBoolean()
  @IsBoolean()
  otkazani?: boolean;
}
