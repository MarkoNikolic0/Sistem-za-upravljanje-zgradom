import { Validators } from '@angular/forms';
import { NIJE_PRAZNO } from '../../shared/nije-prazno';
import { MAKS_KOMENTAR_KVARA } from './kvar-models';

export const PRAVILA_KOMENTARA_KVARA = [
  Validators.required,
  Validators.pattern(NIJE_PRAZNO),
  Validators.maxLength(MAKS_KOMENTAR_KVARA),
];
