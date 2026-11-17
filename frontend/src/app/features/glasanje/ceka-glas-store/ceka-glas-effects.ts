import { DOCUMENT, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  catchError,
  EMPTY,
  filter,
  fromEvent,
  map,
  merge,
  switchMap,
  takeUntil,
  timer,
} from 'rxjs';
import { AuthStore } from '../../auth/sesija/auth-store';
import { VezaActions } from '../../notifikacije/notifikacija-store/notifikacije-actions';
import { GlasanjeService } from '../glasanje-service';
import { cekaGlas, cekanjeDoRoka, NAJVISE_AKTIVNIH, sledeciRok } from '../pravila-glasanja';
import { CekaGlasActions, CekaGlasApiActions } from './ceka-glas-actions';

export const cekaGlasUcitaj = createEffect(
  (
    actions$ = inject(Actions),
    authStore = inject(AuthStore),
    service = inject(GlasanjeService),
    document = inject(DOCUMENT),
  ) =>
    merge(
      actions$.pipe(
        ofType(VezaActions.povezan, CekaGlasActions.glasanjaPromenjena, CekaGlasActions.rokIstekao),
      ),
      actions$.pipe(
        ofType(VezaActions.stigla),
        filter(({ notifikacija }) => notifikacija.tip === 'glasanje_novo'),
      ),
      fromEvent(document, 'visibilitychange').pipe(
        filter(() => document.visibilityState === 'visible'),
      ),
    ).pipe(
      filter(() => {
        const uloga = authStore.korisnik()?.uloga;
        return uloga === 'stanar' || uloga === 'upravnik';
      }),
      switchMap(() =>
        service
          .lista({ stanje: 'aktivna', zgradaId: null, strana: 1, poStrani: NAJVISE_AKTIVNIH })
          .pipe(
            map(({ stavke }) => {
              const cekaju = stavke.filter(cekaGlas);
              return CekaGlasApiActions.ucitano({
                ima: cekaju.length > 0,
                sledeciRok: sledeciRok(cekaju),
              });
            }),
            catchError(() => EMPTY),
            takeUntil(actions$.pipe(ofType(VezaActions.zaustavi))),
          ),
      ),
    ),
  { functional: true },
);

export const cekaGlasRok = createEffect(
  (actions$ = inject(Actions)) =>
    actions$.pipe(
      ofType(CekaGlasApiActions.ucitano),
      switchMap(({ sledeciRok }) =>
        sledeciRok === null
          ? EMPTY
          : timer(cekanjeDoRoka(sledeciRok)).pipe(
              map(() => CekaGlasActions.rokIstekao()),
              takeUntil(actions$.pipe(ofType(VezaActions.zaustavi))),
            ),
      ),
    ),
  { functional: true },
);
