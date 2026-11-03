import { In } from 'typeorm';
import { AKTIVNA_ZGRADA } from '../zgrada/aktivna-zgrada.js';

// Admin upravlja svim aktivnim zgradama, pa arhivirana ne prolazi nijednu proveru ni za njega
export interface PristupZgradama {
  stanuje: number[];
  poseduje: number[];
  vlasnickiStanovi: { id: number; zgradaId: number }[];
  zgrade: number[];
  upravlja: number[];
}

export function sadrzi(zgrade: number[], zgradaId: number) {
  return zgrade.includes(zgradaId);
}

// Odluke i skupštinu vide samo vlasnici stanova u zgradi, upravnik i admin
export function zgradeVlasnika(p: PristupZgradama) {
  return [...new Set([...p.poseduje, ...p.upravlja])];
}

export function samoZgrada(zgrade: number[], zgradaId?: number) {
  if (zgradaId === undefined) {
    return zgrade;
  }
  return sadrzi(zgrade, zgradaId) ? [zgradaId] : [];
}

// Uslov za liste: samo aktivne zgrade, a od njih samo ove (null = sve)
export function uZgradama(zgrade: number[] | null) {
  return {
    zgrada: {
      ...AKTIVNA_ZGRADA,
      ...(zgrade === null ? {} : { id: In(zgrade) }),
    },
  };
}
