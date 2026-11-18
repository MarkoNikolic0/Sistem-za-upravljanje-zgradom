import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { computed } from '@angular/core';
import {
  patchState,
  signalStore,
  signalStoreFeature,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { porukaServera, prvaGreskaPolja } from '../forme/greske-servera';
import { Poruka } from './poruka';

interface AkcijeState {
  poruka: Poruka | null;
  brojAkcija: number;
}

export function withAkcije() {
  return signalStoreFeature(
    withState<AkcijeState>({ poruka: null, brojAkcija: 0 }),
    withComputed(({ brojAkcija }) => ({
      akcijaUToku: computed(() => brojAkcija() > 0),
    })),
    withMethods((store) => {
      let verzija = 0;
      const uToku = new Set<string>();
      async function izvrsi(
        akcija: () => Promise<void>,
        uspeh: string,
        neuspeh: string,
        osvezi: () => void,
        nema?: Poruka,
      ): Promise<boolean> {
        const pocetak = verzija;
        const prikazi = (poruka: Poruka) => {
          if (verzija === pocetak) {
            patchState(store, { poruka });
          }
        };
        patchState(store, (s) => ({ brojAkcija: s.brojAkcija + 1, poruka: null }));
        try {
          await akcija();
          prikazi({ tip: 'uspeh', tekst: uspeh });
          return true;
        } catch (err) {
          const greska = err instanceof HttpErrorResponse ? err : null;
          prikazi(
            greska?.status === 404 && nema
              ? nema
              : {
                  tip: 'greska',
                  tekst: (greska && (prvaGreskaPolja(greska) ?? porukaServera(greska))) ?? neuspeh,
                },
          );
          if (greska?.status === 404 || greska?.status === 409) {
            osvezi();
          }
          return false;
        } finally {
          patchState(store, (s) => ({ brojAkcija: s.brojAkcija - 1 }));
        }
      }
      return {
        prikaziPoruku(poruka: Poruka): void {
          patchState(store, { poruka });
        },
        ponisti(): void {
          verzija++;
          patchState(store, { poruka: null });
        },
        izvrsi,
        async jednom(kljuc: string, akcija: () => Promise<boolean>): Promise<boolean> {
          if (uToku.has(kljuc)) {
            return false;
          }
          uToku.add(kljuc);
          try {
            return await akcija();
          } finally {
            uToku.delete(kljuc);
          }
        },
        izvrsiZahtev(
          zahtev: Observable<unknown>,
          uspeh: string,
          neuspeh: string,
          osvezi: () => void,
          nema?: Poruka,
        ): Promise<boolean> {
          return izvrsi(
            async () => {
              await firstValueFrom(zahtev);
              osvezi();
            },
            uspeh,
            neuspeh,
            osvezi,
            nema,
          );
        },
      };
    }),
  );
}

export const AkcijeStore = signalStore(withAkcije());
