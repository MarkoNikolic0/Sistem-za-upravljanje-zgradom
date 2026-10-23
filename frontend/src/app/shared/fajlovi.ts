export interface PravilaFajlova {
  tipovi: readonly string[];
  opisTipova: string;
  maksMb: number;
  maksBroj: number;
  vlasnik: string;
  mnozina: string;
}

export function pomocZaFajlove(pravila: PravilaFajlova): string {
  return `${pravila.opisTipova}, do ${pravila.maksMb} MB. Najviše ${pravila.maksBroj} ${pravila.mnozina}.`;
}

export function greskaIzbora(
  fajlovi: File[],
  vecIma: number,
  pravila: PravilaFajlova,
): string | null {
  const { maksBroj, maksMb } = pravila;
  if (vecIma + fajlovi.length > maksBroj) {
    return `${pravila.vlasnik} može imati najviše ${maksBroj} ${pravila.mnozina}. Možeš da dodaš još ${maksBroj - vecIma}.`;
  }
  for (const fajl of fajlovi) {
    if (!pravila.tipovi.includes(fajl.type)) {
      return `Fajl „${fajl.name}“ mora biti ${pravila.opisTipova}.`;
    }
    if (fajl.size > maksMb * 1024 * 1024) {
      return `Fajl „${fajl.name}“ je veći od ${maksMb} MB.`;
    }
  }
  return null;
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
