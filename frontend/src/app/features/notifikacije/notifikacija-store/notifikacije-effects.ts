import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import {
  catchError,
  EMPTY,
  exhaustMap,
  filter,
  map,
  mergeMap,
  of,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { ProfileService } from '../../profile/profile-service';
import { KLJUC_TOASTA } from '../notifikacija-models';
import { NotifikacijaService } from '../notifikacija-service';
import { NotifikacijeActions, NotifikacijeApiActions, VezaActions } from './notifikacije-actions';
import { notifikacijeFeature } from './notifikacije-reducer';
import { NotifikacijeVeza } from '../notifikacije-veza';

const TRAJANJE_TOASTA_MS = 6000;

export const veza = createEffect(
  (actions$ = inject(Actions), notifikacijeVeza = inject(NotifikacijeVeza)) =>
    actions$.pipe(
      ofType(VezaActions.pokreni),
      switchMap(() =>
        notifikacijeVeza.dogadjaji().pipe(
          map((dogadjaj) =>
            dogadjaj.tip === 'povezan'
              ? VezaActions.povezan()
              : VezaActions.stigla({ notifikacija: dogadjaj.notifikacija }),
          ),
          takeUntil(actions$.pipe(ofType(VezaActions.zaustavi))),
        ),
      ),
    ),
  { functional: true },
);

export const brojNeprocitanih = createEffect(
  (actions$ = inject(Actions), service = inject(NotifikacijaService)) =>
    actions$.pipe(
      ofType(VezaActions.povezan, NotifikacijeApiActions.procitana),
      switchMap(() =>
        service.brojNeprocitanih().pipe(
          map((broj) => NotifikacijeApiActions.brojUcitan({ broj })),
          catchError(() => EMPTY),
        ),
      ),
    ),
  { functional: true },
);

export const ucitajListu = createEffect(
  (actions$ = inject(Actions), store = inject(Store), service = inject(NotifikacijaService)) =>
    actions$.pipe(
      ofType(NotifikacijeActions.listaOtvorena, VezaActions.povezan),
      concatLatestFrom(() => [
        store.select(notifikacijeFeature.selectStatus),
        store.select(notifikacijeFeature.selectSamoNeprocitane),
      ]),
      filter(([, status]) => status !== 'pocetno'),
      switchMap(([, , samoNeprocitane]) =>
        service.notifikacije(samoNeprocitane).pipe(
          map((stranica) => NotifikacijeApiActions.listaUcitana({ stranica })),
          catchError(() => of(NotifikacijeApiActions.listaNeuspela())),
        ),
      ),
    ),
  { functional: true },
);

export const ucitajStarije = createEffect(
  (actions$ = inject(Actions), store = inject(Store), service = inject(NotifikacijaService)) =>
    actions$.pipe(
      ofType(NotifikacijeActions.ucitajStarije),
      concatLatestFrom(() => [
        store.select(notifikacijeFeature.selectStavke),
        store.select(notifikacijeFeature.selectSamoNeprocitane),
      ]),
      exhaustMap(([, stavke, samoNeprocitane]) =>
        service.notifikacije(samoNeprocitane, stavke.at(-1)?.id).pipe(
          map((stranica) => NotifikacijeApiActions.starijeUcitane({ stranica })),
          catchError(() => of(NotifikacijeApiActions.starijeNeuspele())),
        ),
      ),
    ),
  { functional: true },
);

export const procitaj = createEffect(
  (actions$ = inject(Actions), service = inject(NotifikacijaService)) =>
    actions$.pipe(
      ofType(NotifikacijeActions.procitaj),
      filter(({ notifikacija }) => !notifikacija.procitano),
      mergeMap(({ notifikacija }) =>
        service.procitaj(notifikacija.id).pipe(
          map(() => NotifikacijeApiActions.procitana({ id: notifikacija.id })),
          catchError(() => EMPTY),
        ),
      ),
    ),
  { functional: true },
);

export const procitajSve = createEffect(
  (actions$ = inject(Actions), service = inject(NotifikacijaService)) =>
    actions$.pipe(
      ofType(NotifikacijeActions.procitajSve),
      exhaustMap(() =>
        service.procitajSve().pipe(
          map(() => NotifikacijeApiActions.procitaneSve()),
          catchError(() => of(NotifikacijeApiActions.procitajSveNeuspelo())),
        ),
      ),
    ),
  { functional: true },
);

export const prikaziToast = createEffect(
  (actions$ = inject(Actions), messageService = inject(MessageService), router = inject(Router)) =>
    actions$.pipe(
      ofType(VezaActions.stigla),
      filter(() => !router.url.startsWith('/notifikacije')),
      tap(({ notifikacija }) =>
        messageService.add({
          key: KLJUC_TOASTA,
          severity: 'info',
          detail: notifikacija.tekst,
          data: notifikacija,
          life: TRAJANJE_TOASTA_MS,
        }),
      ),
    ),
  { functional: true, dispatch: false },
);

export const ukloniToast = createEffect(
  (actions$ = inject(Actions), messageService = inject(MessageService)) =>
    actions$.pipe(
      ofType(VezaActions.zaustavi),
      tap(() => messageService.clear(KLJUC_TOASTA)),
    ),
  { functional: true, dispatch: false },
);

export const osveziProfil = createEffect(
  (actions$ = inject(Actions), profileService = inject(ProfileService)) =>
    actions$.pipe(
      ofType(VezaActions.stigla),
      filter(({ notifikacija }) => notifikacija.tip === 'zahtev_obradjen'),
      tap(() => profileService.profil.reload()),
    ),
  { functional: true, dispatch: false },
);
