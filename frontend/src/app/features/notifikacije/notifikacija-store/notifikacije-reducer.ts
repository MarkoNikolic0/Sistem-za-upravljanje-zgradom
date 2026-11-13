import { createFeature, createReducer, on } from '@ngrx/store';
import { Notifikacija } from '../notifikacija-models';
import { NotifikacijeActions, NotifikacijeApiActions, VezaActions } from './notifikacije-actions';

type StatusListe = 'pocetno' | 'ucitavanje' | 'ucitano' | 'greska';

interface NotifikacijeState {
  brojNeprocitanih: number;
  stavke: Notifikacija[];
  samoNeprocitane: boolean;
  preostaloStarijih: number;
  status: StatusListe;
  ucitavaStarije: boolean;
  greska: string | null;
  poslednjaStigla: number | null;
}

const pocetnoStanje: NotifikacijeState = {
  brojNeprocitanih: 0,
  stavke: [],
  samoNeprocitane: false,
  preostaloStarijih: 0,
  status: 'pocetno',
  ucitavaStarije: false,
  greska: null,
  poslednjaStigla: null,
};

function bezDuplikata(postojece: Notifikacija[], nove: Notifikacija[]): Notifikacija[] {
  const ids = new Set(postojece.map((n) => n.id));
  return [...postojece, ...nove.filter((n) => !ids.has(n.id))];
}

export const notifikacijeFeature = createFeature({
  name: 'notifikacije',
  reducer: createReducer(
    pocetnoStanje,
    on(VezaActions.zaustavi, (): NotifikacijeState => pocetnoStanje),
    on(NotifikacijeApiActions.brojUcitan, (stanje, { broj }): NotifikacijeState => ({
      ...stanje,
      brojNeprocitanih: broj,
    })),
    on(VezaActions.stigla, (stanje, { notifikacija }): NotifikacijeState => ({
      ...stanje,
      brojNeprocitanih: stanje.brojNeprocitanih + 1,
      poslednjaStigla: notifikacija.id,
      stavke:
        stanje.status === 'ucitano' ? bezDuplikata([notifikacija], stanje.stavke) : stanje.stavke,
    })),
    on(NotifikacijeActions.listaOtvorena, (stanje, { samoNeprocitane }): NotifikacijeState => ({
      ...stanje,
      samoNeprocitane,
      stavke: [],
      preostaloStarijih: 0,
      status: 'ucitavanje',
      ucitavaStarije: false,
      greska: null,
    })),
    on(NotifikacijeActions.listaZatvorena, (stanje): NotifikacijeState => ({
      ...pocetnoStanje,
      brojNeprocitanih: stanje.brojNeprocitanih,
      poslednjaStigla: stanje.poslednjaStigla,
    })),
    on(NotifikacijeApiActions.listaUcitana, (stanje, { stranica }): NotifikacijeState => ({
      ...stanje,
      stavke: stranica.stavke,
      preostaloStarijih: stranica.ukupno - stranica.stavke.length,
      status: 'ucitano',
    })),
    on(NotifikacijeApiActions.listaNeuspela, (stanje): NotifikacijeState => ({
      ...stanje,
      status: 'greska',
    })),
    on(NotifikacijeActions.ucitajStarije, (stanje): NotifikacijeState => ({
      ...stanje,
      ucitavaStarije: true,
      greska: null,
    })),
    on(NotifikacijeApiActions.starijeUcitane, (stanje, { stranica }): NotifikacijeState => ({
      ...stanje,
      stavke: bezDuplikata(stanje.stavke, stranica.stavke),
      preostaloStarijih: stranica.ukupno - stranica.stavke.length,
      ucitavaStarije: false,
    })),
    on(NotifikacijeApiActions.starijeNeuspele, (stanje): NotifikacijeState => ({
      ...stanje,
      ucitavaStarije: false,
      greska: 'Starija obaveštenja nisu učitana. Pokušaj ponovo.',
    })),
    on(NotifikacijeApiActions.procitana, (stanje, { id }): NotifikacijeState => ({
      ...stanje,
      brojNeprocitanih: Math.max(0, stanje.brojNeprocitanih - 1),
      stavke: stanje.stavke.map((n) => (n.id === id ? { ...n, procitano: true } : n)),
    })),
    on(NotifikacijeActions.procitajSve, (stanje): NotifikacijeState => ({
      ...stanje,
      greska: null,
    })),
    on(NotifikacijeApiActions.procitaneSve, (stanje): NotifikacijeState => ({
      ...stanje,
      brojNeprocitanih: 0,
      stavke: stanje.stavke.map((n) => (n.procitano ? n : { ...n, procitano: true })),
    })),
    on(NotifikacijeApiActions.procitajSveNeuspelo, (stanje): NotifikacijeState => ({
      ...stanje,
      greska: 'Obaveštenja nisu označena kao pročitana. Pokušaj ponovo.',
    })),
  ),
});
