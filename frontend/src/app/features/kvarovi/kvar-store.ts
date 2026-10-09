import { computed, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { EMPTY, exhaustMap, firstValueFrom, forkJoin, pipe, switchMap, tap } from 'rxjs';
import { KvarService } from './kvar-service';
import { KomentarKvara, Kvar, PrijavaKvaraRequest, StanjeKvara } from './kvar-models';

export const KVAROVA_PO_STRANI = 10;
export const KOMENTARA_PO_STRANI = 20;

interface KvaroviState {
  // Lista
  kvarovi: Kvar[];
  ukupno: number;
  stanje: StanjeKvara;
  strana: number;
  ucitava: boolean;
  greskaUcitavanja: boolean;
  prijavaUToku: boolean;
  // Detalj (izabrani kvar i njegovi komentari, hronološki)
  kvar: Kvar | null;
  ucitavaDetalj: boolean;
  greskaDetalja: 'nije-pronadjen' | 'greska' | null;
  komentari: KomentarKvara[];
  // Koliko starijih komentara još nije učitano
  preostaloStarijih: number;
  ucitavaStarije: boolean;
  slanjeKomentara: boolean;
}

const pocetnoStanje: KvaroviState = {
  kvarovi: [],
  ukupno: 0,
  stanje: 'aktivni',
  strana: 1,
  ucitava: false,
  greskaUcitavanja: false,
  prijavaUToku: false,
  kvar: null,
  ucitavaDetalj: false,
  greskaDetalja: null,
  komentari: [],
  preostaloStarijih: 0,
  ucitavaStarije: false,
  slanjeKomentara: false,
};

export const KvarStore = signalStore(
  withState(pocetnoStanje),
  withComputed(({ ukupno }) => ({
    imaViseStrana: computed(() => ukupno() > KVAROVA_PO_STRANI),
  })),
  withMethods((store, kvarService = inject(KvarService)) => {
    const ucitaj = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { ucitava: true, greskaUcitavanja: false })),
        switchMap(() =>
          kvarService
            .lista({ stanje: store.stanje(), strana: store.strana(), poStrani: KVAROVA_PO_STRANI })
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
          }),
        ),
        switchMap((id) => {
          if (!Number.isInteger(id) || id < 1) {
            patchState(store, { ucitavaDetalj: false, greskaDetalja: 'nije-pronadjen' });
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
                }),
              error: (err: HttpErrorResponse) =>
                patchState(store, {
                  ucitavaDetalj: false,
                  greskaDetalja:
                    err.status === 403 || err.status === 404 ? 'nije-pronadjen' : 'greska',
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
          const najstariji = store.komentari()[0];
          if (!kvar || !najstariji) {
            return EMPTY;
          }
          patchState(store, { ucitavaStarije: true });
          return kvarService.komentari(kvar.id, KOMENTARA_PO_STRANI, najstariji.id).pipe(
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

    return {
      ucitaj,
      ucitajDetalj,
      ucitajStarijeKomentare,
      promeniStanje(stanje: StanjeKvara): void {
        patchState(store, { stanje, strana: 1 });
        ucitaj();
      },
      promeniStranu(strana: number): void {
        patchState(store, { strana });
        ucitaj();
      },
      async prijavi(podaci: PrijavaKvaraRequest): Promise<Kvar> {
        patchState(store, { prijavaUToku: true });
        try {
          const kvar = await firstValueFrom(kvarService.prijavi(podaci));
          patchState(store, { stanje: 'aktivni', strana: 1 });
          ucitaj();
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
    };
  }),
  withHooks({
    onInit(store) {
      store.ucitaj();
    },
  }),
);
