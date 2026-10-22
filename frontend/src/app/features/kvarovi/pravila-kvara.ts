import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { NIJE_PRAZNO } from '../../shared/nije-prazno';
import {
  DANA_ZA_RESAVANJE,
  MAKS_KOMENTAR_KVARA,
  MAKS_SLIKA_KVARA,
  MAKS_VELICINA_SLIKE_MB,
  StatusKvara,
  TIPOVI_SLIKE,
} from './kvar-models';

export const KVAROVA_PO_STRANI = 10;
export const KOMENTARA_PO_STRANI = 20;

export const PRAVILA_KOMENTARA_KVARA = [
  Validators.required,
  Validators.pattern(NIJE_PRAZNO),
  Validators.maxLength(MAKS_KOMENTAR_KVARA),
];

export function jeIspravanId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}

export function jeZavrsen(status: StatusKvara): boolean {
  return ['zatvoren', 'odbijen', 'povucen'].includes(status);
}

export function pratiRok(status: StatusKvara): boolean {
  return ['prijavljen', 'prihvacen', 'dodeljen', 'u_toku'].includes(status);
}

export type StanjeRoka = 'prekoracen' | 'danas' | 'sutra';

export function stanjeRoka(status: StatusKvara, rok: string, sada = new Date()): StanjeRoka | null {
  if (!pratiRok(status)) {
    return null;
  }
  const kraj = new Date(rok);
  if (kraj <= sada) {
    return 'prekoracen';
  }
  const sutra = new Date(sada);
  sutra.setDate(sada.getDate() + 1);
  if (kraj.toDateString() === sada.toDateString()) {
    return 'danas';
  }
  return kraj.toDateString() === sutra.toDateString() ? 'sutra' : null;
}

export function najkasnijiDolazak(rok: string, sada = new Date()): Date {
  const kaoHitno = new Date(sada);
  kaoHitno.setDate(sada.getDate() + DANA_ZA_RESAVANJE.hitno);
  const kraj = new Date(rok);
  return kraj > kaoHitno ? kraj : kaoHitno;
}

export function dolazakUBuducnosti(polje: AbstractControl<Date | null>): ValidationErrors | null {
  const dolazak = polje.value;
  return dolazak && dolazak.getTime() <= Date.now() ? { proslost: true } : null;
}

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
