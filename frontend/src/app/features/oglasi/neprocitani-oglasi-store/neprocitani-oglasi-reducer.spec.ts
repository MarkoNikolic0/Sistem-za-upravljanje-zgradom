import { VezaActions } from '../../notifikacije/notifikacija-store/notifikacije-actions';
import {
  NeprocitaniOglasiActions,
  NeprocitaniOglasiApiActions,
} from './neprocitani-oglasi-actions';
import { neprocitaniOglasiFeature } from './neprocitani-oglasi-reducer';

const { reducer } = neprocitaniOglasiFeature;
const DO = '2026-06-10T10:00:00.000Z';
const oznaceni = (procitanoDo: string, osveziListu: boolean) =>
  NeprocitaniOglasiApiActions.oznaceniProcitani({ procitanoDo, osveziListu });

describe('neprocitani oglasi reducer', () => {
  it('dok je lista otvorena, pamti od kada su oglasi novi i broji osvežavanja', () => {
    let s = reducer(undefined, NeprocitaniOglasiApiActions.brojUcitan({ broj: 4 }));
    s = reducer(s, NeprocitaniOglasiActions.listaOtvorena());
    s = reducer(s, oznaceni(DO, false));
    expect(s).toMatchObject({ broj: 0, noviPosle: DO, osvezenja: 0 });
    s = reducer(s, oznaceni('2026-06-11T10:00:00.000Z', true));
    expect(s).toMatchObject({ noviPosle: DO, osvezenja: 1 });
    s = reducer(s, NeprocitaniOglasiActions.listaZatvorena());
    expect(s).toMatchObject({ listaOtvorena: false, noviPosle: null });
  });

  it('kad lista nije otvorena, samo briše broj', () => {
    const s = reducer(
      reducer(undefined, NeprocitaniOglasiApiActions.brojUcitan({ broj: 2 })),
      oznaceni(DO, true),
    );
    expect(s).toMatchObject({ broj: 0, noviPosle: null, osvezenja: 0 });
  });

  it('odjava vraća početno stanje', () => {
    const s = reducer(undefined, NeprocitaniOglasiApiActions.brojUcitan({ broj: 2 }));
    expect(reducer(s, VezaActions.zaustavi())).toEqual(reducer(undefined, { type: '@@init' }));
  });
});
