import { computed, inject, LOCALE_ID } from '@angular/core';
import { formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { concatMap, EMPTY, Observable, pipe, switchMap, tap } from 'rxjs';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '../../shared/with-request-status';
import { kvarEvents } from './kvar-events';
import {
  KvarDetalj,
  NAZIVI_PRIORITETA_KVARA,
  PorukaAkcije,
  PrioritetKvara,
  StatusRadaServisera,
} from './kvar-models';
import { KvarService } from './kvar-service';
import { jeIspravanId } from './pravila-kvara';
import { porukaServera, prvaGreskaPolja } from '../../shared/greske-servera';

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
    case 400:
      return prvaGreskaPolja(err) ?? porukaServera(err) ?? 'Akcija nije izvršena. Pokušaj ponovo.';
    default:
      return 'Akcija nije izvršena. Pokušaj ponovo.';
  }
}

function nePostoji(err: HttpErrorResponse): boolean {
  return err.status === 403 || err.status === 404;
}

interface DetaljKvaraState {
  kvar: KvarDetalj | null;
  akcijaUToku: boolean;
  porukaAkcije: PorukaAkcije | null;
  porukaPosleUcitavanja: PorukaAkcije | null;
}

export const DetaljKvaraStore = signalStore(
  withState<DetaljKvaraState>({
    kvar: null,
    akcijaUToku: false,
    porukaAkcije: null,
    porukaPosleUcitavanja: null,
  }),
  withRequestStatus(),
  withComputed(({ kvar, isFulfilled }) => {
    const vracanja = computed(() => {
      const istorija = kvar()?.istorija ?? [];
      return istorija.filter(
        (p, i) => p.status === 'u_toku' && istorija[i - 1]?.status === 'resen',
      );
    });
    return {
      nePostoji: computed(() => isFulfilled() && !kvar()),
      vracanja,
      poslednjeVracanje: computed(() => {
        const k = kvar();
        const poslednja = k?.istorija.at(-1);
        return k?.status === 'u_toku' && poslednja && vracanja().includes(poslednja)
          ? poslednja
          : undefined;
      }),
      razlogZavrsetka: computed(() => {
        const k = kvar();
        const poslednja = k?.istorija.at(-1);
        return (k?.status === 'odbijen' || k?.status === 'povucen') &&
          poslednja?.status === k.status &&
          poslednja.komentar
          ? poslednja
          : undefined;
      }),
    };
  }),
  withMethods(
    (
      store,
      kvarService = inject(KvarService),
      dispatcher = inject(Dispatcher),
      locale = inject(LOCALE_ID),
    ) => {
      function prikazi(kvar: KvarDetalj): void {
        patchState(store, { kvar });
        dispatcher.dispatch(kvarEvents.azuriran(kvar));
      }

      const ucitaj = rxMethod<number>(
        pipe(
          tap(() => patchState(store, { kvar: null, porukaAkcije: null }, setPending())),
          switchMap((id) => {
            if (!jeIspravanId(id)) {
              patchState(store, { porukaPosleUcitavanja: null }, setFulfilled());
              return EMPTY;
            }
            return kvarService.nadjiKvar(id).pipe(
              tapResponse({
                next: (kvar) => {
                  patchState(
                    store,
                    {
                      kvar,
                      porukaAkcije: store.porukaPosleUcitavanja(),
                      porukaPosleUcitavanja: null,
                    },
                    setFulfilled(),
                  );
                },
                error: (err: HttpErrorResponse) =>
                  patchState(
                    store,
                    { porukaPosleUcitavanja: null },
                    nePostoji(err)
                      ? setFulfilled()
                      : setError('Kvar trenutno ne može da se učita.'),
                  ),
              }),
            );
          }),
        ),
      );

      const osvezi = rxMethod<number>(
        pipe(
          switchMap((id) =>
            kvarService.nadjiKvar(id).pipe(
              tapResponse({
                next: (kvar) => prikazi(kvar),
                error: (err: HttpErrorResponse) => {
                  if (nePostoji(err)) {
                    patchState(store, { kvar: null });
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
                next: (kvar) => {
                  prikazi(kvar);
                  patchState(store, { porukaAkcije: { tip: 'uspeh', tekst: uspeh(kvar), fokus } });
                },
                error: (err: HttpErrorResponse) => {
                  patchState(store, {
                    porukaAkcije: { tip: 'greska', tekst: porukaGreske(err), fokus },
                  });
                  const kvar = store.kvar();
                  if (kvar) {
                    osvezi(kvar.id);
                  }
                },
                finalize: () => patchState(store, { akcijaUToku: false }),
              }),
            );
          }),
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
        prikaziPosleUcitavanja(poruka: PorukaAkcije | undefined): void {
          patchState(store, { porukaPosleUcitavanja: poruka ?? null });
        },
        prihvati(): void {
          akcija(
            (id) => kvarService.prihvati(id),
            () => 'Kvar je prihvaćen.',
          );
        },
        odbij(tekst: string): void {
          akcija(
            (id) => kvarService.odbij(id, tekst),
            () => 'Prijava je odbijena. Razlog je upisan u komentare.',
          );
        },
        povuci(tekst: string): void {
          akcija(
            (id) => kvarService.povuci(id, tekst),
            () => 'Prijava je povučena. Kvar je prešao u završene.',
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
            (kvar) =>
              `Prioritet je promenjen: ${NAZIVI_PRIORITETA_KVARA[kvar.prioritet]}. Novi rok: ${formatDate(kvar.rokResavanja, 'd. MMM y. HH:mm', locale)}.`,
            false,
          );
        },
        postaviDolazak(dolazak: Date | null): void {
          akcija(
            (id) => kvarService.postaviDolazak(id, dolazak),
            () =>
              dolazak ? 'Dolazak je upisan. Stanar ga vidi na vrhu kvara.' : 'Dolazak je uklonjen.',
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
            (id) => kvarService.vrati(id, tekst),
            () => 'Kvar je vraćen serviseru. Tvoj komentar je dodat.',
          );
        },
        prati(): void {
          akcija(
            (id) => kvarService.prati(id).pipe(switchMap(() => kvarService.nadjiKvar(id))),
            () => 'Pratiš ovaj kvar. Upravnik vidi da je i kod tebe isti problem.',
          );
        },
        prestaniPracenje(): void {
          akcija(
            (id) =>
              kvarService.prestaniPracenje(id).pipe(switchMap(() => kvarService.nadjiKvar(id))),
            () => 'Više ne pratiš ovaj kvar.',
          );
        },
        zatvori(): void {
          akcija(
            (id) => kvarService.zatvori(id),
            () => 'Kvar je zatvoren.',
          );
        },
      };
    },
  ),
);
