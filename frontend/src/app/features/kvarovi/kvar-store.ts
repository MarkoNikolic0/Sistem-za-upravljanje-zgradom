import { computed, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import {
  concatMap,
  EMPTY,
  exhaustMap,
  firstValueFrom,
  forkJoin,
  Observable,
  pipe,
  switchMap,
  tap,
} from 'rxjs';
import { KvarService } from './kvar-service';
import {
  KomentarKvara,
  Kvar,
  KvarDetalj,
  NAZIVI_PRIORITETA_KVARA,
  PrijavaKvaraRequest,
  PrioritetKvara,
  StanjeKvara,
  StatusRadaServisera,
} from './kvar-models';

export const KVAROVA_PO_STRANI = 10;
export const KOMENTARA_PO_STRANI = 20;

interface PorukaAkcije {
  tip: 'uspeh' | 'greska';
  tekst: string;
  fokus: boolean;
}

interface Akcija {
  zahtev: Observable<KvarDetalj>;
  uspeh: (kvar: KvarDetalj) => string;
  fokus: boolean;
}

function porukaGreske(err: HttpErrorResponse): string {
  switch (err.status) {
    case 409:
      return 'Kvar je u međuvremenu promenjen. Prikazano je trenutno stanje.';
    case 403:
      return 'Nemaš pravo na ovu akciju.';
    case 400: {
      const telo = err.error as { message?: unknown } | null;
      if (typeof telo?.message === 'string') {
        return telo.message;
      }
      return 'Akcija nije izvršena. Pokušaj ponovo.';
    }
    default:
      return 'Akcija nije izvršena. Pokušaj ponovo.';
  }
}

interface KvaroviState {
  kvarovi: Kvar[];
  ukupno: number;
  stanje: StanjeKvara;
  zgradaId: number | null;
  strana: number;
  ucitava: boolean;
  greskaUcitavanja: boolean;
  listaZatrazena: boolean;
  prijavaUToku: boolean;
  kvar: KvarDetalj | null;
  ucitavaDetalj: boolean;
  greskaDetalja: 'nije-pronadjen' | 'greska' | null;
  komentari: KomentarKvara[];
  preostaloStarijih: number;
  ucitavaStarije: boolean;
  slanjeKomentara: boolean;
  akcijaUToku: boolean;
  porukaAkcije: PorukaAkcije | null;
  porukaPosleUcitavanja: PorukaAkcije | null;
}

const pocetnoStanje: KvaroviState = {
  kvarovi: [],
  ukupno: 0,
  stanje: 'aktivni',
  zgradaId: null,
  strana: 1,
  ucitava: false,
  greskaUcitavanja: false,
  listaZatrazena: false,
  prijavaUToku: false,
  kvar: null,
  ucitavaDetalj: false,
  greskaDetalja: null,
  komentari: [],
  preostaloStarijih: 0,
  ucitavaStarije: false,
  slanjeKomentara: false,
  akcijaUToku: false,
  porukaAkcije: null,
  porukaPosleUcitavanja: null,
};

export const KvarStore = signalStore(
  withState(pocetnoStanje),
  withComputed(({ ukupno, kvar }) => {
    const vracanja = computed(() => {
      const istorija = kvar()?.istorija ?? [];
      return istorija.filter(
        (p, i) => p.status === 'u_toku' && istorija[i - 1]?.status === 'resen',
      );
    });
    return {
      imaViseStrana: computed(() => ukupno() > KVAROVA_PO_STRANI),
      vracanja,
      poslednjeVracanje: computed(() => {
        const k = kvar();
        const poslednja = k?.istorija.at(-1);
        return k?.status === 'u_toku' && poslednja && vracanja().includes(poslednja)
          ? poslednja
          : undefined;
      }),
    };
  }),
  withMethods((store, kvarService = inject(KvarService)) => {
    const ucitaj = rxMethod<void>(
      pipe(
        tap(() =>
          patchState(store, { ucitava: true, greskaUcitavanja: false, listaZatrazena: true }),
        ),
        switchMap(() =>
          kvarService
            .lista({
              stanje: store.stanje(),
              zgradaId: store.zgradaId(),
              strana: store.strana(),
              poStrani: KVAROVA_PO_STRANI,
            })
            .pipe(
              tapResponse({
                next: ({ stavke, ukupno }) => {
                  if (stavke.length === 0 && store.strana() > 1) {
                    patchState(store, { strana: store.strana() - 1 });
                    ucitaj();
                    return;
                  }
                  patchState(store, { kvarovi: stavke, ukupno, ucitava: false });
                },
                error: () => patchState(store, { ucitava: false, greskaUcitavanja: true }),
              }),
            ),
        ),
      ),
    );

    const ucitajDetalj = rxMethod<number>(
      pipe(
        tap(() =>
          patchState(store, {
            kvar: null,
            komentari: [],
            ucitavaDetalj: true,
            greskaDetalja: null,
            porukaAkcije: null,
          }),
        ),
        switchMap((id) => {
          if (!Number.isInteger(id) || id < 1) {
            patchState(store, {
              ucitavaDetalj: false,
              greskaDetalja: 'nije-pronadjen',
              porukaPosleUcitavanja: null,
            });
            return EMPTY;
          }
          return forkJoin({
            kvar: kvarService.nadjiKvar(id),
            komentari: kvarService.komentari(id, KOMENTARA_PO_STRANI),
          }).pipe(
            tapResponse({
              next: ({ kvar, komentari }) =>
                patchState(store, {
                  kvar,
                  komentari: [...komentari.stavke].reverse(),
                  preostaloStarijih: komentari.ukupno - komentari.stavke.length,
                  ucitavaDetalj: false,
                  porukaAkcije: store.porukaPosleUcitavanja(),
                  porukaPosleUcitavanja: null,
                }),
              error: (err: HttpErrorResponse) =>
                patchState(store, {
                  ucitavaDetalj: false,
                  greskaDetalja:
                    err.status === 403 || err.status === 404 ? 'nije-pronadjen' : 'greska',
                  porukaPosleUcitavanja: null,
                }),
            }),
          );
        }),
      ),
    );

    const ucitajStarijeKomentare = rxMethod<void>(
      pipe(
        exhaustMap(() => {
          const kvar = store.kvar();
          if (!kvar) {
            return EMPTY;
          }
          patchState(store, { ucitavaStarije: true });
          const najstariji = store.komentari().at(0);
          return kvarService.komentari(kvar.id, KOMENTARA_PO_STRANI, najstariji?.id).pipe(
            tapResponse({
              next: ({ stavke, ukupno }) =>
                patchState(store, {
                  komentari: [...[...stavke].reverse(), ...store.komentari()],
                  preostaloStarijih: ukupno - stavke.length,
                  ucitavaStarije: false,
                }),
              error: () => patchState(store, { ucitavaStarije: false }),
            }),
          );
        }),
      ),
    );

    const osveziKvar = rxMethod<number>(
      pipe(
        switchMap((id) =>
          kvarService.nadjiKvar(id).pipe(
            tapResponse({
              next: (kvar) => patchState(store, { kvar, listaZatrazena: false }),
              error: (err: HttpErrorResponse) => {
                if (err.status === 403 || err.status === 404) {
                  patchState(store, { kvar: null, greskaDetalja: 'nije-pronadjen' });
                }
              },
            }),
          ),
        ),
      ),
    );

    const izvrsi = rxMethod<Akcija>(
      pipe(
        concatMap(({ zahtev, uspeh, fokus }) => {
          patchState(store, { akcijaUToku: true, porukaAkcije: null });
          return zahtev.pipe(
            tapResponse({
              next: (kvar) =>
                patchState(store, {
                  kvar,
                  listaZatrazena: false,
                  porukaAkcije: { tip: 'uspeh', tekst: uspeh(kvar), fokus },
                }),
              error: (err: HttpErrorResponse) => {
                patchState(store, {
                  porukaAkcije: { tip: 'greska', tekst: porukaGreske(err), fokus },
                });
                const kvar = store.kvar();
                if (kvar) {
                  osveziKvar(kvar.id);
                }
              },
              finalize: () => patchState(store, { akcijaUToku: false }),
            }),
          );
        }),
      ),
    );

    const osveziKomentare = rxMethod<number>(
      pipe(
        switchMap((id) =>
          kvarService.komentari(id, KOMENTARA_PO_STRANI).pipe(
            tapResponse({
              next: ({ stavke, ukupno }) =>
                patchState(store, {
                  komentari: [...stavke].reverse(),
                  preostaloStarijih: ukupno - stavke.length,
                }),
              error: () => undefined,
            }),
          ),
        ),
      ),
    );

    function akcija(
      zahtev: (id: number) => Observable<KvarDetalj>,
      uspeh: (kvar: KvarDetalj) => string,
      fokus = true,
    ): void {
      const kvar = store.kvar();
      if (kvar) {
        izvrsi({ zahtev: zahtev(kvar.id), uspeh, fokus });
      }
    }

    return {
      ucitaj,
      prikaziListu(): void {
        if (!store.listaZatrazena()) {
          ucitaj();
        }
      },
      ucitajDetalj,
      ucitajStarijeKomentare,
      promeniStanje(stanje: StanjeKvara): void {
        patchState(store, { stanje, strana: 1 });
        ucitaj();
      },
      promeniZgradu(zgradaId: number | null): void {
        patchState(store, { zgradaId, strana: 1 });
        ucitaj();
      },
      promeniStranu(strana: number): void {
        patchState(store, { strana });
        ucitaj();
      },
      async prijavi(podaci: PrijavaKvaraRequest, slike: File[]): Promise<Kvar> {
        patchState(store, { prijavaUToku: true });
        try {
          const kvar = await firstValueFrom(kvarService.prijavi(podaci));
          patchState(store, { stanje: 'aktivni', strana: 1 });
          ucitaj();
          let nisuDodate = 0;
          for (const slika of slike) {
            try {
              await firstValueFrom(kvarService.dodajSliku(kvar.id, slika));
            } catch {
              nisuDodate++;
            }
          }
          if (nisuDodate > 0) {
            patchState(store, {
              porukaPosleUcitavanja: {
                tip: 'greska',
                tekst: `Kvar je prijavljen, ali neke slike nisu dodate (${nisuDodate} od ${slike.length}). Dodaj ih ponovo u odeljku Slike.`,
                fokus: true,
              },
            });
          }
          return kvar;
        } finally {
          patchState(store, { prijavaUToku: false });
        }
      },
      async dodajKomentar(tekst: string): Promise<void> {
        const kvar = store.kvar();
        if (!kvar) {
          return;
        }
        patchState(store, { slanjeKomentara: true });
        try {
          const komentar = await firstValueFrom(kvarService.dodajKomentar(kvar.id, tekst));
          patchState(store, { komentari: [...store.komentari(), komentar] });
        } finally {
          patchState(store, { slanjeKomentara: false });
        }
      },
      async obrisiKomentar(id: number): Promise<void> {
        await firstValueFrom(kvarService.obrisiKomentar(id));
        patchState(store, { komentari: store.komentari().filter((k) => k.id !== id) });
      },
      prihvati(): void {
        akcija(
          (id) => kvarService.prihvati(id),
          () => 'Kvar je prihvaćen.',
        );
      },
      odbij(): void {
        akcija(
          (id) => kvarService.odbij(id),
          () => 'Kvar je odbijen.',
        );
      },
      dodeliServisera(serviserId: number): void {
        akcija(
          (id) => kvarService.dodeliServisera(id, serviserId),
          ({ serviser }) => `Kvar je dodeljen serviseru: ${serviser?.ime} ${serviser?.prezime}.`,
        );
      },
      postaviPrioritet(prioritet: PrioritetKvara): void {
        akcija(
          (id) => kvarService.postaviPrioritet(id, prioritet),
          (kvar) => `Prioritet je promenjen: ${NAZIVI_PRIORITETA_KVARA[kvar.prioritet]}.`,
          false,
        );
      },
      promeniStatus(status: StatusRadaServisera): void {
        akcija(
          (id) => kvarService.promeniStatus(id, status),
          () => (status === 'u_toku' ? 'Rad na kvaru je započet.' : 'Kvar je označen kao rešen.'),
        );
      },
      potvrdi(): void {
        akcija(
          (id) => kvarService.potvrdi(id),
          () => 'Hvala na potvrdi. Kvar je zatvoren.',
        );
      },
      vrati(tekst: string): void {
        akcija(
          (id) => kvarService.vrati(id, tekst).pipe(tap(() => osveziKomentare(id))),
          () => 'Kvar je vraćen serviseru. Tvoj komentar je dodat.',
        );
      },
      zatvori(): void {
        akcija(
          (id) => kvarService.zatvori(id),
          () => 'Kvar je zatvoren.',
        );
      },
    };
  }),
);
