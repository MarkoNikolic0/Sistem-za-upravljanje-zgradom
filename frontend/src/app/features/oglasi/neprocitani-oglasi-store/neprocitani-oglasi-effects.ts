import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { catchError, concatMap, EMPTY, filter, map, of, switchMap, takeUntil } from 'rxjs';
import { AuthStore } from '../../auth/sesija/auth-store';
import { VezaActions } from '../../notifikacije/notifikacija-store/notifikacije-actions';
import { OglasService } from '../oglas-service';
import {
  NeprocitaniOglasiActions,
  NeprocitaniOglasiApiActions,
} from './neprocitani-oglasi-actions';
import { neprocitaniOglasiFeature } from './neprocitani-oglasi-reducer';

export const neprocitaniOglasi = createEffect(
  (
    actions$ = inject(Actions),
    store = inject(Store),
    authStore = inject(AuthStore),
    service = inject(OglasService),
  ) =>
    actions$.pipe(
      ofType(VezaActions.povezan, VezaActions.novOglas, NeprocitaniOglasiActions.listaOtvorena),
      filter(() => {
        const uloga = authStore.korisnik()?.uloga;
        return uloga === 'stanar' || uloga === 'upravnik';
      }),
      concatLatestFrom(() => store.select(neprocitaniOglasiFeature.selectListaOtvorena)),
      concatMap(([akcija, listaOtvorena]) => {
        const otvaranje = akcija.type === NeprocitaniOglasiActions.listaOtvorena.type;
        return service.brojNeprocitanih().pipe(
          switchMap(({ broj, procitanoDo }) =>
            otvaranje || (listaOtvorena && broj > 0)
              ? service.procitajSve().pipe(
                  map(() =>
                    NeprocitaniOglasiApiActions.oznaceniProcitani({
                      procitanoDo,
                      osveziListu: !otvaranje,
                    }),
                  ),
                )
              : of(NeprocitaniOglasiApiActions.brojUcitan({ broj })),
          ),
          catchError(() => EMPTY),
          takeUntil(actions$.pipe(ofType(VezaActions.zaustavi))),
        );
      }),
    ),
  { functional: true },
);
