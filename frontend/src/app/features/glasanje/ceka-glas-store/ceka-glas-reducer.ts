import { createFeature, createReducer, on } from '@ngrx/store';
import { VezaActions } from '../../notifikacije/notifikacija-store/notifikacije-actions';
import { CekaGlasApiActions } from './ceka-glas-actions';

interface CekaGlasState {
  ima: boolean;
}

const pocetnoStanje: CekaGlasState = {
  ima: false,
};

export const cekaGlasFeature = createFeature({
  name: 'cekaGlas',
  reducer: createReducer(
    pocetnoStanje,
    on(VezaActions.zaustavi, (): CekaGlasState => pocetnoStanje),
    on(CekaGlasApiActions.ucitano, (stanje, { ima }): CekaGlasState => ({ ...stanje, ima })),
  ),
});
