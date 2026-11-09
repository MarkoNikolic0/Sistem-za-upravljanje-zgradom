import { VrstaSastanka } from '../shared/enums/sastanak.enums.js';
import { pragKvoruma } from '../shared/kvorum.js';
import type { StanSaStanarima } from '../stanar-stana/stanovi-sa-stanarima.js';

export interface OdgovorStanara {
  korisnikId: number;
  stanId: number;
  vlasnik: boolean;
  dolazi: boolean;
}

export interface PodaciPregleda {
  vrsta: VrstaSastanka;
  ukupnoStanova: number;
  odgovori: OdgovorStanara[];
  prisutno: number | null;
}

function imaPravo(vrsta: VrstaSastanka, vlasnik: boolean) {
  return vrsta === VrstaSastanka.ZBOR || vlasnik;
}

export function pregledPrisustva(
  { vrsta, ukupnoStanova, odgovori, prisutno }: PodaciPregleda,
  korisnikId: number,
) {
  const pozvani = odgovori.filter((o) => imaPravo(vrsta, o.vlasnik));
  const dolaze = pozvani.filter((o) => o.dolazi);
  const korisnika = (redovi: OdgovorStanara[]) =>
    new Set(redovi.map((o) => o.korisnikId)).size;

  return {
    dolazi: korisnika(dolaze),
    neDolazi: korisnika(pozvani.filter((o) => !o.dolazi)),
    mojOdgovor:
      pozvani.find((o) => o.korisnikId === korisnikId)?.dolazi ?? null,
    kvorum:
      vrsta === VrstaSastanka.SKUPSTINA
        ? {
            ukupno: ukupnoStanova,
            prag: pragKvoruma(ukupnoStanova),
            najavljeno: new Set(dolaze.map((o) => o.stanId)).size,
            prisutno,
          }
        : null,
  };
}

export function spisakPrisustva(
  vrsta: VrstaSastanka,
  stanovi: StanSaStanarima[],
  odgovori: Map<number, boolean>,
  prisutni: Set<number>,
) {
  return stanovi.map((s) => ({
    id: s.id,
    broj: s.broj,
    sprat: s.sprat,
    prisutan: prisutni.has(s.id),
    stanari: s.stanari
      .filter((st) => imaPravo(vrsta, st.vlasnik))
      .map((st) => ({
        id: st.korisnik.id,
        ime: st.korisnik.ime,
        prezime: st.korisnik.prezime,
        vlasnik: st.vlasnik,
        dolazi: odgovori.get(st.korisnik.id) ?? null,
      })),
  }));
}
