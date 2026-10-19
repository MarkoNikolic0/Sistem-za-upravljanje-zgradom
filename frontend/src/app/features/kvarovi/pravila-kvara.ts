import { Validators } from '@angular/forms';
import { NIJE_PRAZNO } from '../../shared/nije-prazno';
import {
  MAKS_KOMENTAR_KVARA,
  MAKS_SLIKA_KVARA,
  MAKS_VELICINA_SLIKE_MB,
  TIPOVI_SLIKE,
} from './kvar-models';

export const PRAVILA_KOMENTARA_KVARA = [
  Validators.required,
  Validators.pattern(NIJE_PRAZNO),
  Validators.maxLength(MAKS_KOMENTAR_KVARA),
];

export const POMOC_ZA_SLIKE = `JPG, PNG ili WEBP, do ${MAKS_VELICINA_SLIKE_MB} MB. Najviše ${MAKS_SLIKA_KVARA} slika.`;

export function greskaIzboraSlika(fajlovi: File[], vecIma: number): string | null {
  if (vecIma + fajlovi.length > MAKS_SLIKA_KVARA) {
    return `Kvar može imati najviše ${MAKS_SLIKA_KVARA} slika. Možeš da dodaš još ${MAKS_SLIKA_KVARA - vecIma}.`;
  }
  for (const fajl of fajlovi) {
    if (!TIPOVI_SLIKE.includes(fajl.type)) {
      return `Slika „${fajl.name}“ mora biti JPG, PNG ili WEBP.`;
    }
    if (fajl.size > MAKS_VELICINA_SLIKE_MB * 1024 * 1024) {
      return `Slika „${fajl.name}“ mora biti manja od ${MAKS_VELICINA_SLIKE_MB} MB.`;
    }
  }
  return null;
}
