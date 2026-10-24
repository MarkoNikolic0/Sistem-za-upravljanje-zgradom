import { HttpErrorResponse } from '@angular/common/http';
import { patchState, signalStoreFeature, withMethods, withState } from '@ngrx/signals';
import { porukaServera, prvaGreskaPolja } from './greske-servera';
import { Poruka } from './poruka';

interface AkcijeState {
  poruka: Poruka | null;
  akcijaUToku: boolean;
}

export function withAkcije() {
  return signalStoreFeature(
    withState<AkcijeState>({ poruka: null, akcijaUToku: false }),
    withMethods((store) => ({
      prikaziPoruku(poruka: Poruka): void {
        patchState(store, { poruka });
      },
      async izvrsi(
        akcija: () => Promise<void>,
        uspeh: string,
        neuspeh: string,
        osvezi: () => void,
      ): Promise<boolean> {
        patchState(store, { akcijaUToku: true, poruka: null });
        try {
          await akcija();
          patchState(store, { poruka: { tip: 'uspeh', tekst: uspeh } });
          return true;
        } catch (err) {
          const greska = err instanceof HttpErrorResponse ? err : null;
          patchState(store, {
            poruka: {
              tip: 'greska',
              tekst: (greska && (prvaGreskaPolja(greska) ?? porukaServera(greska))) ?? neuspeh,
            },
          });
          if (greska?.status === 404 || greska?.status === 409) {
            osvezi();
          }
          return false;
        } finally {
          patchState(store, { akcijaUToku: false });
        }
      },
    })),
  );
}
