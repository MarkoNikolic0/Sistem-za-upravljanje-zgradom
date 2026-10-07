import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

const MAKS_PO_STRANI = 50;

export class StranicenjeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  strana: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  poStrani: number = 20;
}

export interface Stranica<T> {
  stavke: T[];
  ukupno: number;
}

export function stranicenje({ strana, poStrani }: StranicenjeDto) {
  const take = Math.min(poStrani, MAKS_PO_STRANI);
  return { skip: (strana - 1) * take, take };
}
