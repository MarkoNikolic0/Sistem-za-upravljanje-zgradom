import { VrstaSastanka } from '../shared/enums/sastanak.enums.js';
import { pragKvoruma } from '../shared/kvorum.js';
import type { StanSaStanarima } from '../stanar-stana/stanovi-sa-stanarima.js';

export interface PodaciPrisustva {
  vrsta: VrstaSastanka;
  stanovi: StanSaStanarima[];
  odgovori: Map<number, boolean>;
  prisutni: Set<number> | null;
}

function imaPravo(vrsta: VrstaSastanka, vlasnik: boolean) {
  return vrsta === VrstaSastanka.ZBOR || vlasnik;
}

export function pregledPrisustva(
  { vrsta, stanovi, odgovori, prisutni }: PodaciPrisustva,
  korisnikId: number,
) {
  const pozvani = new Set(
    stanovi.flatMap((s) =>
      s.stanari
        .filter((st) => imaPravo(vrsta, st.vlasnik))
        .map((st) => st.korisnik.id),
    ),
  );
  const dolaze = [...pozvani].filter((id) => odgovori.get(id) === true);
  const neDolaze = [...pozvani].filter((id) => odgovori.get(id) === false);

  return {
    dolazi: dolaze.length,
    neDolazi: neDolaze.length,
    mojOdgovor: pozvani.has(korisnikId)
      ? (odgovori.get(korisnikId) ?? null)
      : null,
    kvorum:
      vrsta === VrstaSastanka.SKUPSTINA
        ? {
            ukupno: stanovi.length,
            prag: pragKvoruma(stanovi.length),
            najavljeno: stanovi.filter((s) =>
              s.stanari.some(
                (st) => st.vlasnik && odgovori.get(st.korisnik.id) === true,
              ),
            ).length,
            prisutno:
              prisutni === null
                ? null
                : stanovi.filter((s) => prisutni.has(s.id)).length,
          }
        : null,
  };
}

export function spisakPrisustva({
  vrsta,
  stanovi,
  odgovori,
  prisutni,
}: PodaciPrisustva) {
  return stanovi.map((s) => ({
    id: s.id,
    broj: s.broj,
    sprat: s.sprat,
    prisutan: prisutni?.has(s.id) ?? false,
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
