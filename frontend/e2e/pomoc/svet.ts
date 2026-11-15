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
}

let svet: Promise<Svet> | undefined;

export function ucitajSvet(): Promise<Svet> {
  svet ??= fetch(`${ADRESA_POMOCI}/svet`).then((odgovor) => odgovor.json() as Promise<Svet>);
  return svet;
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
  const link = /https?:\/\/\S+/.exec(tekst)?.[0];
  if (!link) {
    throw new Error(`Mejl za ${email} nema link.`);
  }
  return link;
}
