import { vi } from 'vitest';
import type { Mail } from '../../src/shared/mail/mail.service.js';

export class LaznaPosta {
  private poslati: Mail[] = [];
  odbija = false;

  posalji(mail: Mail): Promise<boolean> {
    if (this.odbija) {
      return Promise.resolve(false);
    }
    this.poslati.push(mail);
    return Promise.resolve(true);
  }

  za(email: string): Mail[] {
    return this.poslati.filter((mail) => mail.za === email);
  }

  async sacekaj(email: string, naslov: string): Promise<Mail> {
    return await vi.waitFor(
      () => {
        const indeks = this.poslati.findIndex(
          (mail) => mail.za === email && mail.naslov === naslov,
        );
        if (indeks === -1) {
          throw new Error(`Mejl „${naslov}“ za ${email} nije stigao.`);
        }
        return this.poslati.splice(indeks, 1)[0];
      },
      { timeout: 5000, interval: 20 },
    );
  }
}

export function linkIzMejla(mail: Mail): URL {
  const link = /https?:\/\/\S+/.exec(mail.tekst)?.[0];
  if (!link) {
    throw new Error(`Mejl „${mail.naslov}“ nema link.`);
  }
  return new URL(link);
}

export function tokenIzMejla(mail: Mail): string {
  const token = linkIzMejla(mail).searchParams.get('token');
  if (!token) {
    throw new Error(`Mejl „${mail.naslov}“ nema link sa tokenom.`);
  }
  return token;
}

export class LaznoSkladiste {
  readonly fajlovi = new Map<string, { sadrzaj: Buffer; tip: string }>();

  sacuvaj(kljuc: string, sadrzaj: Buffer, tip: string): Promise<void> {
    this.fajlovi.set(kljuc, { sadrzaj, tip });
    return Promise.resolve();
  }

  obrisi(...kljucevi: string[]): Promise<void> {
    for (const kljuc of kljucevi) {
      this.fajlovi.delete(kljuc);
    }
    return Promise.resolve();
  }

  link(kljuc: string): Promise<string> {
    return Promise.resolve(`http://skladiste.test/${kljuc}`);
  }
}
