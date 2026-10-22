import { computed, inject } from '@angular/core';
import { ProfileService } from '../profile/profile-service';
import { ZgradaService } from '../zgrade/zgrada-service';
import { zgradeIzProfila } from './pravila-oglasa';

// Zgrade u kojima korisnik vidi i objavljuje oglase: admin sve, ostali iz profila
export function injectZgradeOglasa() {
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
    return zgradeIzProfila(profil.value());
  });
  return { profil, admin, zgrade };
}
