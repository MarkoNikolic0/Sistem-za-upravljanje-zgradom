import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { patchState, signalStore, signalStoreFeature, withMethods, withState } from '@ngrx/signals';
import { porukaServera, prvaGreskaPolja } from './greske-servera';
import { Poruka } from './poruka';

interface AkcijeState {
  poruka: Poruka | null;
  akcijaUToku: boolean;
}

export function withAkcije() {
  return signalStoreFeature(
    withState<AkcijeState>({ poruka: null, akcijaUToku: false }),
    withMethods((store) => {
      let verzija = 0;
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
        patchState(store, { akcijaUToku: true, poruka: null });
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
          patchState(store, { akcijaUToku: false });
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
