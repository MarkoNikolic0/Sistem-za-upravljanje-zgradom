import { ProfileResponse } from '../profile/profile-models';
import { ZgradaOsnovno } from '../zgrade/zgrada-models';

export const OGLASA_PO_STRANI = 10;

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
