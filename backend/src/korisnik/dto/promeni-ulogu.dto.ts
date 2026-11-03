import { IsIn } from 'class-validator';
import { Uloga } from '../../shared/enums/uloga.enum.js';

// Upravnik se dodeljuje preko zgrade, admin samo u bazi
export const DODELJIVE_ULOGE = [Uloga.STANAR, Uloga.SERVISER] as const;

export class PromeniUloguDto {
  @IsIn(DODELJIVE_ULOGE, { message: 'Izaberi ulogu stanar ili serviser.' })
  uloga: (typeof DODELJIVE_ULOGE)[number];
}
