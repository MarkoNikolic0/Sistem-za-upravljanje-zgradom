import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { PodaciStanaDto } from './create-stan.dto.js';

export const MAKS_STANOVA_ODJEDNOM = 200;

export class CreateStanoviDto {
  @IsInt()
  zgradaId: number;

  @ValidateNested({ each: true })
  @Type(() => PodaciStanaDto)
  @ArrayMaxSize(MAKS_STANOVA_ODJEDNOM, {
    message: `Odjednom se može dodati najviše ${MAKS_STANOVA_ODJEDNOM} stanova.`,
  })
  @ArrayMinSize(1, { message: 'Dodaj bar jedan stan.' })
  @IsArray()
  stanovi: PodaciStanaDto[];
}
