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
import { Glasanje } from '../glasanje-models';
import { GlasanjeService } from '../glasanje-service';
import { cekaGlas, NAJVISE_AKTIVNIH } from '../pravila-glasanja';
import { CekaGlasActions, CekaGlasApiActions } from './ceka-glas-actions';

const NAJDUZE_CEKANJE_MS = 2_147_483_647;
const POSLE_ROKA_MS = 1_000;

function sledeciRok(cekaju: Glasanje[], sada = Date.now()): number | null {
  const rokovi = cekaju.map((g) => new Date(g.rok).getTime()).filter((rok) => rok > sada);
  return rokovi.length > 0 ? Math.min(...rokovi) : null;
}

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
          : timer(Math.min(sledeciRok - Date.now() + POSLE_ROKA_MS, NAJDUZE_CEKANJE_MS)).pipe(
              map(() => CekaGlasActions.rokIstekao()),
              takeUntil(actions$.pipe(ofType(VezaActions.zaustavi))),
            ),
      ),
    ),
  { functional: true },
);
