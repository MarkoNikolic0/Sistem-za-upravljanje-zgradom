import { AbstractControl, ValidationErrors } from '@angular/forms';
import { MS_PO_DANU } from '../../shared/datum';
import { Glasanje } from './glasanje-models';

export const DANA_ANKETE = 7;
export const NAJVISE_DANA_ANKETE = 30;

const relativno = new Intl.RelativeTimeFormat('sr-Latn', { numeric: 'auto' });
const procenat = new Intl.NumberFormat('sr-Latn', { style: 'percent', maximumFractionDigits: 0 });

// Broj kalendarskih dana do roka (0 = danas), da „sutra“ važi i kad je rok sutra ujutru
function danaDoRoka(rok: string, sada = new Date()): number {
  const kraj = new Date(rok);
  const danKraja = new Date(kraj.getFullYear(), kraj.getMonth(), kraj.getDate());
  const danas = new Date(sada.getFullYear(), sada.getMonth(), sada.getDate());
  return Math.round((danKraja.getTime() - danas.getTime()) / MS_PO_DANU);
}

// „ističe danas“, „ističe sutra“, „ističe za 5 dana“
export function istice(rok: string): string {
  return `ističe ${relativno.format(danaDoRoka(rok), 'day')}`;
}

export function isticeUskoro(rok: string): boolean {
  return danaDoRoka(rok) <= 1;
}

const mnozina = new Intl.PluralRules('sr-Latn');
const OBLICI_GLASA: Partial<Record<Intl.LDMLPluralRule, string>> = { one: 'glas', few: 'glasa' };

export function glasova(broj: number): string {
  return `${broj} ${OBLICI_GLASA[mnozina.select(broj)] ?? 'glasova'}`;
}

export function udeo(broj: number, ukupno: number): number {
  return ukupno === 0 ? 0 : broj / ukupno;
}

export function uProcentima(deo: number): string {
  return procenat.format(deo);
}

export function vodece(glasanje: Glasanje): number[] {
  const najvise = Math.max(...glasanje.opcije.map((o) => o.brojGlasova ?? 0));
  return najvise === 0
    ? []
    : glasanje.opcije.filter((o) => o.brojGlasova === najvise).map((o) => o.id);
}

export function razliciteOpcije(polje: AbstractControl<string[]>): ValidationErrors | null {
  const opcije = polje.value.map((o) => o.trim().toLocaleLowerCase('sr')).filter(Boolean);
  return new Set(opcije).size === opcije.length ? null : { iste: true };
}
