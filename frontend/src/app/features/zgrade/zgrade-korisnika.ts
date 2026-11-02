import { computed, inject } from '@angular/core';
import { ProfileResponse } from '../profile/profile-models';
import { ProfileService } from '../profile/profile-service';
import { ZgradaOsnovno } from './zgrada-models';
import { ZgradaService } from './zgrada-service';

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

// Zgrade za izbor na stranici: admin dobija sve posebnim zahtevom, ostali iz profila
function injectZgrade(izProfila: (profil: ProfileResponse) => ZgradaOsnovno[]) {
  const profil = inject(ProfileService).profile();
  const admin = computed(() => profil.hasValue() && profil.value().uloga === 'admin');
  const sveZgrade = inject(ZgradaService).zgrade(admin);
  const zgrade = computed(() => {
    if (!profil.hasValue()) {
      return [];
    }
    if (admin()) {
      return sveZgrade.hasValue() ? sveZgrade.value() : [];
    }
    return izProfila(profil.value());
  });
  // Adminu zgrade stižu posebnim zahtevom, pa je spremno tek kad stigne i on
  const ucitano = computed(
    () => profil.hasValue() && (!admin() || sveZgrade.status() === 'resolved'),
  );
  const greska = computed(() => profil.error() ?? sveZgrade.error());
  return { profil, admin, zgrade, ucitano, greska };
}

// Zgrade koje korisnik vidi (oglasi, glasanje)
export function injectZgradeKorisnika() {
  return injectZgrade(zgradeIzProfila);
}

// Zgrade kojima korisnik upravlja (kontakti, stanari)
export function injectZgradeUpravnika() {
  return injectZgrade((profil) => (profil.zgrada ? [profil.zgrada] : []));
}
