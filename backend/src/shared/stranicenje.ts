import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export const MAKS_PO_STRANI = 50;

export class PoStraniDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  poStrani: number = 20;
}

export class StranicenjeDto extends PoStraniDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  strana: number = 1;
}

export interface Stranica<T> {
  stavke: T[];
  ukupno: number;
}

export function velicinaStrane(poStrani: number): number {
  return Math.min(poStrani, MAKS_PO_STRANI);
}

export function stranicenje({ strana, poStrani }: StranicenjeDto) {
  const take = velicinaStrane(poStrani);
  return { skip: (strana - 1) * take, take };
}
