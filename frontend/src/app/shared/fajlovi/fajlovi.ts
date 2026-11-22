export interface PravilaFajlova {
  tipovi: readonly string[];
  opisTipova: string;
  maksMb: number;
  maksBroj: number;
  vlasnik: string;
  mnozina: string;
}

export function pomocZaFajlove(pravila: PravilaFajlova): string {
  const osnovno = `${pravila.opisTipova}, do ${pravila.maksMb} MB.`;
  return pravila.maksBroj > 1
    ? `${osnovno} Najviše ${pravila.maksBroj} ${pravila.mnozina}.`
    : osnovno;
}

// Ispravni fajlovi se prihvataju, a za odbijene se vraća jedna poruka
export function proveriIzbor(
  fajlovi: File[],
  vecIma: number,
  pravila: PravilaFajlova,
): { ispravni: File[]; greska: string | null } {
  const { maksBroj, maksMb } = pravila;
  if (vecIma + fajlovi.length > maksBroj) {
    return {
      ispravni: [],
      greska: `${pravila.vlasnik} može imati najviše ${maksBroj} ${pravila.mnozina}. Možeš da dodaš još ${maksBroj - vecIma}.`,
    };
  }
  const greske: string[] = [];
  const ispravni = fajlovi.filter((fajl) => {
    if (!pravila.tipovi.includes(fajl.type)) {
      greske.push(`Fajl „${fajl.name}“ mora biti ${pravila.opisTipova}.`);
      return false;
    }
    if (fajl.size > maksMb * 1024 * 1024) {
      greske.push(`Fajl „${fajl.name}“ je veći od ${maksMb} MB.`);
      return false;
    }
    return true;
  });
  return { ispravni, greska: greske.length > 0 ? greske.join(' ') : null };
}

export function jeSlika(tip: string): boolean {
  return tip.startsWith('image/');
}

const KB = new Intl.NumberFormat('sr-Latn', { style: 'unit', unit: 'kilobyte' });
const MB = new Intl.NumberFormat('sr-Latn', {
  style: 'unit',
  unit: 'megabyte',
  maximumFractionDigits: 1,
});

export function velicinaFajla(bajtova: number): string {
  return bajtova < 1024 * 1024
    ? KB.format(Math.max(1, Math.round(bajtova / 1024)))
    : MB.format(bajtova / 1024 / 1024);
}
