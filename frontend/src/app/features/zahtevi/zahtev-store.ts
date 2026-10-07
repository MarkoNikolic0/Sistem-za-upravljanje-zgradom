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
import { concatMap, pipe, switchMap, tap } from 'rxjs';
import { ZahtevService } from './zahtev-service';
import { FilterZahteva, ZahtevUpravnika } from './zahtev-models';

export const ZAHTEVA_PO_STRANI = 10;

interface Poruka {
  tip: 'uspeh' | 'greska';
  tekst: string;
}

interface Obrada {
  zahtev: ZahtevUpravnika;
  status: 'prihvacen' | 'odbijen';
  vlasnik?: boolean;
}

interface ZahteviState {
  zahtevi: ZahtevUpravnika[];
  ukupno: number;
  filter: FilterZahteva;
  strana: number;
  ucitava: boolean;
  greskaUcitavanja: boolean;
  zahtevUObradiId: number | null;
  poruka: Poruka | null;
}

const pocetnoStanje: ZahteviState = {
  zahtevi: [],
  ukupno: 0,
  filter: 'na_cekanju',
  strana: 1,
  ucitava: false,
  greskaUcitavanja: false,
  zahtevUObradiId: null,
  poruka: null,
};

function porukaUspeha({ zahtev, status, vlasnik }: Obrada): string {
  const ko = `${zahtev.korisnik.ime} ${zahtev.korisnik.prezime}, stan ${zahtev.stan.broj}`;
  if (status === 'odbijen') {
    return `Zahtev je odbijen: ${ko}.`;
  }
  return `Zahtev je prihvaćen: ${ko} (${vlasnik ? 'vlasnik' : 'stanar'}).`;
}

export const ZahteviStore = signalStore(
  withState(pocetnoStanje),
  withComputed(({ ukupno }) => ({
    imaViseStrana: computed(() => ukupno() > ZAHTEVA_PO_STRANI),
  })),
  withMethods((store, zahtevService = inject(ZahtevService)) => {
    const ucitaj = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { ucitava: true, greskaUcitavanja: false })),
        switchMap(() =>
          zahtevService
            .zahteviZaObradu({
              status: store.filter() === 'na_cekanju' ? 'na_cekanju' : undefined,
              strana: store.strana(),
              poStrani: ZAHTEVA_PO_STRANI,
            })
            .pipe(
              tapResponse({
                next: ({ stavke, ukupno }) => {
                  if (stavke.length === 0 && store.strana() > 1) {
                    patchState(store, { strana: store.strana() - 1 });
                    ucitaj();
                    return;
                  }
                  patchState(store, { zahtevi: stavke, ukupno, ucitava: false });
                },
                error: () => patchState(store, { ucitava: false, greskaUcitavanja: true }),
              }),
            ),
        ),
      ),
    );

    const obradi = rxMethod<Obrada>(
      pipe(
        tap(({ zahtev }) => patchState(store, { zahtevUObradiId: zahtev.id, poruka: null })),
        concatMap((obrada) =>
          zahtevService
            .obradi(obrada.zahtev.id, { status: obrada.status, vlasnik: obrada.vlasnik })
            .pipe(
              tapResponse({
                next: () => {
                  patchState(store, {
                    zahtevUObradiId: null,
                    poruka: { tip: 'uspeh', tekst: porukaUspeha(obrada) },
                  });
                  ucitaj();
                },
                error: (err: HttpErrorResponse) => {
                  patchState(store, {
                    zahtevUObradiId: null,
                    poruka: {
                      tip: 'greska',
                      tekst:
                        err.status === 409
                          ? 'Zahtev je u međuvremenu već obrađen.'
                          : 'Zahtev nije obrađen. Pokušaj ponovo za nekoliko trenutaka.',
                    },
                  });
                  ucitaj();
                },
              }),
            ),
        ),
      ),
    );

    return {
      ucitaj,
      promeniFilter(filter: FilterZahteva): void {
        patchState(store, { filter, strana: 1, poruka: null });
        ucitaj();
      },
      promeniStranu(strana: number): void {
        patchState(store, { strana });
        ucitaj();
      },
      prihvati(zahtev: ZahtevUpravnika, vlasnik: boolean): void {
        obradi({ zahtev, status: 'prihvacen', vlasnik });
      },
      odbij(zahtev: ZahtevUpravnika): void {
        obradi({ zahtev, status: 'odbijen' });
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.ucitaj();
    },
  }),
);
