import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { KaoBoolean } from '../../shared/kao-boolean.js';
import { PoStraniDto } from '../../shared/stranicenje.js';

export class NotifikacijaUpitDto extends PoStraniDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  preId?: number;

  @IsOptional()
  @KaoBoolean()
  @IsBoolean()
  neprocitane?: boolean;
}
