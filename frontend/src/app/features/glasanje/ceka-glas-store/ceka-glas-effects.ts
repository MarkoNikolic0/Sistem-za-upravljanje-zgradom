import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, EMPTY, filter, map, switchMap, takeUntil } from 'rxjs';
import { AuthStore } from '../../auth/sesija/auth-store';
import { VezaActions } from '../../notifikacije/notifikacija-store/notifikacije-actions';
import { GlasanjeService } from '../glasanje-service';
import { cekaGlas } from '../pravila-glasanja';
import { CekaGlasActions, CekaGlasApiActions } from './ceka-glas-actions';

const NAJVISE_AKTIVNIH = 50;

export const cekaGlasUcitaj = createEffect(
  (actions$ = inject(Actions), authStore = inject(AuthStore), service = inject(GlasanjeService)) =>
    actions$.pipe(
      ofType(VezaActions.povezan, VezaActions.stigla, CekaGlasActions.glasanjaPromenjena),
      filter(
        (akcija) =>
          akcija.type !== VezaActions.stigla.type || akcija.notifikacija.tip === 'glasanje_novo',
      ),
      filter(() => {
        const uloga = authStore.korisnik()?.uloga;
        return uloga === 'stanar' || uloga === 'upravnik';
      }),
      switchMap(() =>
        service
          .lista({ stanje: 'aktivna', zgradaId: null, strana: 1, poStrani: NAJVISE_AKTIVNIH })
          .pipe(
            map(({ stavke }) => CekaGlasApiActions.ucitano({ ima: stavke.some(cekaGlas) })),
            catchError(() => EMPTY),
            takeUntil(actions$.pipe(ofType(VezaActions.zaustavi))),
          ),
      ),
    ),
  { functional: true },
);
