import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class OdlukeZgradeUpitDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  zgradaId: number;
}
