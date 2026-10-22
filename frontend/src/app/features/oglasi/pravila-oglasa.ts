import { AbstractControl, ValidationErrors } from '@angular/forms';
import { ProfileResponse } from '../profile/profile-models';
import { ZgradaOsnovno } from '../zgrade/zgrada-models';
import { VrstaOglasa } from './oglas-models';

export const OGLASA_PO_STRANI = 10;

export const DANA_VAZENJA = 30;

// Prodaja, traženje i izgubljeno brzo zastarevaju, pa forma za njih predlaže rok
const VRSTE_SA_ROKOM: VrstaOglasa[] = ['prodaja', 'trazim', 'izgubljeno'];

export function predlozenRok(vrsta: VrstaOglasa | null): Date | null {
  if (vrsta === null || !VRSTE_SA_ROKOM.includes(vrsta)) {
    return null;
  }
  const danas = new Date();
  return new Date(danas.getFullYear(), danas.getMonth(), danas.getDate() + DANA_VAZENJA);
}

export function krajDana(datum: Date): Date {
  return new Date(datum.getFullYear(), datum.getMonth(), datum.getDate(), 23, 59, 59, 999);
}

export function formatRoka(rok: string): string {
  return new Date(rok).getFullYear() === new Date().getFullYear() ? 'd. MMM' : 'd. MMM y.';
}

export function rokNijeProsao(polje: AbstractControl<Date | null>): ValidationErrors | null {
  const rok = polje.value;
  return rok && krajDana(rok).getTime() <= Date.now() ? { proslost: true } : null;
}

// Zgrade u kojima korisnik stanuje i zgrada kojom upravlja (admin dobija sve zgrade posebno)
export function zgradeIzProfila(profil: ProfileResponse): ZgradaOsnovno[] {
  const zgrade = new Map<number, ZgradaOsnovno>();
  if (profil.zgrada) {
    zgrade.set(profil.zgrada.id, profil.zgrada);
  }
  for (const stan of profil.stanovi) {
    zgrade.set(stan.zgrada.id, stan.zgrada);
  }
  return [...zgrade.values()].sort((a, b) => a.naziv.localeCompare(b.naziv));
}

export function upravljaZgradom(profil: ProfileResponse, zgradaId: number | null): boolean {
  return profil.uloga === 'admin' || (zgradaId !== null && profil.zgrada?.id === zgradaId);
}
