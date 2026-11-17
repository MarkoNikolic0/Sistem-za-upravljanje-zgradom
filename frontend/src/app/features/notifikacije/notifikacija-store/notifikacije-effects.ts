import { inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
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
  merge,
  mergeMap,
  of,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { ProfileService } from '../../profile/profile-service';
import { KLJUC_TOASTA, putanjaAdrese, TIPOVI_ZA_PROFIL } from '../notifikacija-models';
import { NotifikacijaService } from '../notifikacija-service';
import { NotifikacijeActions, NotifikacijeApiActions, VezaActions } from './notifikacije-actions';
import { notifikacijeFeature } from './notifikacije-reducer';
import { NotifikacijeVeza } from '../notifikacije-veza';
import { PushObavestenja } from '../push-obavestenja';

const TRAJANJE_TOASTA_MS = 6000;

const krajListe = (actions$: Actions) =>
  actions$.pipe(
    ofType(
      NotifikacijeActions.listaOtvorena,
      NotifikacijeActions.listaZatvorena,
      VezaActions.zaustavi,
    ),
  );

export const veza = createEffect(
  (
    actions$ = inject(Actions),
    notifikacijeVeza = inject(NotifikacijeVeza),
    router = inject(Router),
  ) =>
    actions$.pipe(
      ofType(VezaActions.pokreni),
      switchMap(() =>
        notifikacijeVeza.dogadjaji().pipe(
          map((dogadjaj) => {
            switch (dogadjaj.tip) {
              case 'povezan':
                return VezaActions.povezan();
              case 'nov-oglas':
                return VezaActions.novOglas();
              case 'notifikacija':
                return VezaActions.stigla({
                  notifikacija: dogadjaj.notifikacija,
                  naStranici: dogadjaj.notifikacija.link === putanjaAdrese(router.url),
                });
            }
          }),
          takeUntil(actions$.pipe(ofType(VezaActions.zaustavi))),
        ),
      ),
    ),
  { functional: true },
);

export const neprocitane = createEffect(
  (actions$ = inject(Actions), service = inject(NotifikacijaService)) =>
    actions$.pipe(
      ofType(VezaActions.povezan, VezaActions.stigla),
      filter((akcija) => !('naStranici' in akcija && akcija.naStranici)),
      switchMap(() =>
        service.neprocitane().pipe(
          map((neprocitane) => NotifikacijeApiActions.neprocitaneUcitane(neprocitane)),
          catchError(() => EMPTY),
        ),
      ),
    ),
  { functional: true },
);

export const sinhronizujPush = createEffect(
  (actions$ = inject(Actions), push = inject(PushObavestenja)) =>
    actions$.pipe(
      ofType(VezaActions.povezan),
      exhaustMap(() => push.sinhronizuj()),
    ),
  { functional: true, dispatch: false },
);

export const procitajNaOtvorenojStranici = createEffect(
  (actions$ = inject(Actions), service = inject(NotifikacijaService)) =>
    actions$.pipe(
      ofType(VezaActions.stigla),
      filter(({ naStranici }) => naStranici),
      mergeMap(({ notifikacija }) =>
        service.procitaj(notifikacija.id).pipe(catchError(() => EMPTY)),
      ),
    ),
  { functional: true, dispatch: false },
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
          takeUntil(
            actions$.pipe(ofType(NotifikacijeActions.listaZatvorena, VezaActions.zaustavi)),
          ),
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
          takeUntil(krajListe(actions$)),
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
          map(() => NotifikacijeApiActions.procitana({ notifikacija })),
          catchError(() => EMPTY),
        ),
      ),
    ),
  { functional: true },
);

export const procitajOtvorenuStranicu = createEffect(
  (
    actions$ = inject(Actions),
    router = inject(Router),
    store = inject(Store),
    service = inject(NotifikacijaService),
  ) =>
    merge(
      router.events.pipe(filter((dogadjaj) => dogadjaj instanceof NavigationEnd)),
      actions$.pipe(ofType(NotifikacijeApiActions.neprocitaneUcitane)),
    ).pipe(
      map(() => putanjaAdrese(router.url)),
      concatLatestFrom(() => store.select(notifikacijeFeature.selectLinkovi)),
      filter(([link, linkovi]) => Object.hasOwn(linkovi, link)),
      mergeMap(([link]) =>
        service.procitajStranicu(link).pipe(
          map(() => NotifikacijeApiActions.stranicaProcitana({ link })),
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
      tap(({ notifikacija, naStranici }) =>
        messageService.add({
          key: KLJUC_TOASTA,
          detail: notifikacija.tekst,
          data: naStranici ? { ...notifikacija, link: null } : notifikacija,
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
      filter(({ notifikacija }) => TIPOVI_ZA_PROFIL.includes(notifikacija.tip)),
      tap(() => profileService.profil.reload()),
    ),
  { functional: true, dispatch: false },
);
