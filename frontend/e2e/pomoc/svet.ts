import { expect } from '@playwright/test';

export const ADRESA_POMOCI = 'http://127.0.0.1:3101';

export interface Akter {
  id: number;
  email: string;
}

interface ZgradaSveta {
  id: number;
  stanovi: number[];
  upravnik: Akter;
  vlasnik: Akter;
  ukucanin: Akter;
  sused: Akter;
}

export interface Svet {
  lozinka: string;
  a: ZgradaSveta;
  b: ZgradaSveta;
  admin: Akter;
  serviser: Akter;
  bezStana: Akter;
  zaboravni: Akter;
  promenaLozinke: Akter;
  dveZgrade: { upravnik: Akter; zgrade: number[] };
  arhiviranaZgrada: number;
}

let svet: Promise<Svet> | undefined;

export function ucitajSvet(): Promise<Svet> {
  svet ??= fetch(`${ADRESA_POMOCI}/svet`)
    .then((odgovor) => {
      if (!odgovor.ok) {
        throw new Error(`Pomoćni server je vratio ${odgovor.status}.`);
      }
      return odgovor.json() as Promise<Svet>;
    })
    .catch((greska: unknown) => {
      svet = undefined;
      throw greska;
    });
  return svet;
}

export async function pomeriUProslost(vrsta: 'sastanak' | 'glasanje', id: number) {
  const odgovor = await fetch(`${ADRESA_POMOCI}/${vrsta}/${id}/proslo`, { method: 'POST' });
  if (!odgovor.ok) {
    throw new Error(`Pomeranje ${vrsta} ${id} u prošlost nije uspelo (${odgovor.status}).`);
  }
}

export async function linkIzMejla(email: string): Promise<string> {
  const adresa = `${ADRESA_POMOCI}/mejl?za=${encodeURIComponent(email)}`;
  let tekst = '';
  await expect
    .poll(
      async () => {
        const odgovor = await fetch(adresa);
        tekst = odgovor.ok ? ((await odgovor.json()) as { tekst: string }).tekst : '';
        return tekst;
      },
      { message: `Za ${email} nije stigao mejl.` },
    )
    .not.toBe('');
  const link = /https?:\/\/\S+/.exec(tekst)?.[0].replace(/[.,;:!?)]+$/, '');
  if (!link) {
    throw new Error(`Mejl za ${email} nema link.`);
  }
  return link;
}
