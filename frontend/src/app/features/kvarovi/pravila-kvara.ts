import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { NIJE_PRAZNO } from '../../shared/nije-prazno';
import { DANA_ZA_RESAVANJE, MAKS_KOMENTAR_KVARA, StatusKvara } from './kvar-models';
import { PravilaFajlova } from '../../shared/fajlovi';

export const KVAROVA_PO_STRANI = 10;
export const KOMENTARA_PO_STRANI = 20;

export const PRAVILA_KOMENTARA_KVARA = [
  Validators.required,
  Validators.pattern(NIJE_PRAZNO),
  Validators.maxLength(MAKS_KOMENTAR_KVARA),
];

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

export const PRAVILA_SLIKA_KVARA: PravilaFajlova = {
  tipovi: ['image/jpeg', 'image/png', 'image/webp'],
  opisTipova: 'JPG, PNG ili WEBP',
  maksMb: 10,
  maksBroj: 5,
  vlasnik: 'Kvar',
  mnozina: 'slika',
};
