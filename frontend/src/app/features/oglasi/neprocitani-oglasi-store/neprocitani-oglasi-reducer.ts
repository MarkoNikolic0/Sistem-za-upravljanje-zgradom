import { createFeature, createReducer, on } from '@ngrx/store';
import { VezaActions } from '../../notifikacije/notifikacija-store/notifikacije-actions';
import {
  NeprocitaniOglasiActions,
  NeprocitaniOglasiApiActions,
} from './neprocitani-oglasi-actions';

interface NeprocitaniOglasiState {
  broj: number;
  listaOtvorena: boolean;
  noviPosle: string | null;
}

const pocetnoStanje: NeprocitaniOglasiState = {
  broj: 0,
  listaOtvorena: false,
  noviPosle: null,
};

export const neprocitaniOglasiFeature = createFeature({
  name: 'neprocitaniOglasi',
  reducer: createReducer(
    pocetnoStanje,
    on(VezaActions.zaustavi, (): NeprocitaniOglasiState => pocetnoStanje),
    on(NeprocitaniOglasiApiActions.brojUcitan, (stanje, { broj }): NeprocitaniOglasiState => ({
      ...stanje,
      broj,
    })),
    on(NeprocitaniOglasiActions.listaOtvorena, (stanje): NeprocitaniOglasiState => ({
      ...stanje,
      listaOtvorena: true,
    })),
    on(NeprocitaniOglasiActions.listaZatvorena, (stanje): NeprocitaniOglasiState => ({
      ...stanje,
      listaOtvorena: false,
      noviPosle: null,
    })),
    on(
      NeprocitaniOglasiApiActions.oznaceniProcitani,
      (stanje, { procitanoDo }): NeprocitaniOglasiState => ({
        ...stanje,
        broj: 0,
        noviPosle: stanje.noviPosle ?? procitanoDo,
      }),
    ),
  ),
});
