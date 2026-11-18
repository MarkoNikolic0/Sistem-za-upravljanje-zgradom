import { AbstractControl, ValidationErrors } from '@angular/forms';

export const MS_PO_DANU = 24 * 60 * 60 * 1000;

export function zaDana(broj: number, od = new Date()): Date {
  return new Date(od.getFullYear(), od.getMonth(), od.getDate() + broj);
}

const DAN_U_SRBIJI = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' });

export function danaDo(datum: Date | string, sada = new Date()): number {
  const dan = (d: Date) => Date.parse(DAN_U_SRBIJI.format(d));
  return Math.round((dan(new Date(datum)) - dan(sada)) / MS_PO_DANU);
}

export function krajDana(datum: Date): Date {
  return new Date(datum.getFullYear(), datum.getMonth(), datum.getDate(), 23, 59, 59, 999);
}

// Format za DatePipe: godina samo kad nije tekuća
export function formatRoka(rok: string): string {
  return new Date(rok).getFullYear() === new Date().getFullYear() ? 'd. MMM' : 'd. MMM y.';
}

export function rokNijeProsao(polje: AbstractControl<Date | null>): ValidationErrors | null {
  const rok = polje.value;
  return rok && krajDana(rok).getTime() <= Date.now() ? { proslost: true } : null;
}
