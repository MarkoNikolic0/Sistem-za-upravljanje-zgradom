import { Validators } from '@angular/forms';

export const MIN_DUZINA_LOZINKE = 8;

export const PRAVILA_LOZINKE = [Validators.required, Validators.minLength(MIN_DUZINA_LOZINKE)];
