import { Validators } from '@angular/forms';
import { NIJE_PRAZNO } from '../../shared/nije-prazno';

export const MIN_DUZINA_LOZINKE = 8;
export const MAX_DUZINA_LOZINKE = 64;
export const MAX_DUZINA_IMENA = 50;

export const PRAVILA_LOZINKE = [
  Validators.required,
  Validators.minLength(MIN_DUZINA_LOZINKE),
  Validators.maxLength(MAX_DUZINA_LOZINKE),
];

export const PRAVILA_IMENA = [
  Validators.required,
  Validators.pattern(NIJE_PRAZNO),
  Validators.maxLength(MAX_DUZINA_IMENA),
];
