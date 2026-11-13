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
  osvezenja: number;
}

const pocetnoStanje: NeprocitaniOglasiState = {
  broj: 0,
  listaOtvorena: false,
  noviPosle: null,
  osvezenja: 0,
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
      osvezenja: 0,
    })),
    on(NeprocitaniOglasiActions.listaZatvorena, (stanje): NeprocitaniOglasiState => ({
      ...stanje,
      listaOtvorena: false,
      noviPosle: null,
    })),
    on(
      NeprocitaniOglasiApiActions.oznaceniProcitani,
      (stanje, { procitanoDo, osveziListu }): NeprocitaniOglasiState =>
        stanje.listaOtvorena
          ? {
              ...stanje,
              broj: 0,
              noviPosle: stanje.noviPosle ?? procitanoDo,
              osvezenja: osveziListu ? stanje.osvezenja + 1 : stanje.osvezenja,
            }
          : { ...stanje, broj: 0 },
    ),
  ),
});
