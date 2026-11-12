import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { KaoBoolean } from '../../shared/kao-boolean.js';

export class NotifikacijaUpitDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  poStrani: number = 20;

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
