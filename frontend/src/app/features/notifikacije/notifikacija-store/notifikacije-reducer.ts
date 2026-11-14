import { createFeature, createReducer, createSelector, on } from '@ngrx/store';
import { Neprocitano, Notifikacija, odeljakLinka } from '../notifikacija-models';
import { NotifikacijeActions, NotifikacijeApiActions, VezaActions } from './notifikacije-actions';

type StatusListe = 'pocetno' | 'ucitavanje' | 'ucitano' | 'greska';

interface NotifikacijeState {
  brojNeprocitanih: number;
  linkovi: Record<string, Neprocitano>;
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
  linkovi: {},
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

function dodajNeprocitanu(
  linkovi: Record<string, Neprocitano>,
  { link, tip }: Notifikacija,
): Record<string, Neprocitano> {
  return link === null
    ? linkovi
    : { ...linkovi, [link]: { broj: (linkovi[link]?.broj ?? 0) + 1, tip } };
}

function ukloniProcitanu(
  linkovi: Record<string, Neprocitano>,
  link: string | null,
): Record<string, Neprocitano> {
  if (link === null || !Object.hasOwn(linkovi, link)) {
    return linkovi;
  }
  const { [link]: neprocitano, ...ostali } = linkovi;
  return neprocitano.broj > 1
    ? { ...ostali, [link]: { ...neprocitano, broj: neprocitano.broj - 1 } }
    : ostali;
}

export const notifikacijeFeature = createFeature({
  name: 'notifikacije',
  reducer: createReducer(
    pocetnoStanje,
    on(VezaActions.zaustavi, (): NotifikacijeState => pocetnoStanje),
    on(
      NotifikacijeApiActions.neprocitaneUcitane,
      (stanje, { broj, linkovi }): NotifikacijeState => ({
        ...stanje,
        brojNeprocitanih: broj,
        linkovi,
      }),
    ),
    on(VezaActions.stigla, (stanje, { notifikacija }): NotifikacijeState => ({
      ...stanje,
      brojNeprocitanih: stanje.brojNeprocitanih + 1,
      linkovi: dodajNeprocitanu(stanje.linkovi, notifikacija),
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
      linkovi: stanje.linkovi,
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
    on(
      NotifikacijeApiActions.procitana,
      (stanje, { notifikacija: { id, link } }): NotifikacijeState => {
        const procitanaSaStranicom = link !== null && !Object.hasOwn(stanje.linkovi, link);
        return {
          ...stanje,
          brojNeprocitanih: procitanaSaStranicom
            ? stanje.brojNeprocitanih
            : Math.max(0, stanje.brojNeprocitanih - 1),
          linkovi: ukloniProcitanu(stanje.linkovi, link),
          stavke: stanje.stavke.map((n) => (n.id === id ? { ...n, procitano: true } : n)),
        };
      },
    ),
    on(NotifikacijeApiActions.stranicaProcitana, (stanje, { link }): NotifikacijeState => {
      const { [link]: procitano, ...ostali } = stanje.linkovi;
      return {
        ...stanje,
        brojNeprocitanih: Math.max(0, stanje.brojNeprocitanih - (procitano?.broj ?? 0)),
        linkovi: ostali,
        stavke: stanje.stavke.map((n) => (n.link === link ? { ...n, procitano: true } : n)),
      };
    }),
    on(NotifikacijeActions.procitajSve, (stanje): NotifikacijeState => ({
      ...stanje,
      greska: null,
    })),
    on(NotifikacijeApiActions.procitaneSve, (stanje): NotifikacijeState => ({
      ...stanje,
      brojNeprocitanih: 0,
      linkovi: {},
      stavke: stanje.stavke.map((n) => (n.procitano ? n : { ...n, procitano: true })),
    })),
    on(NotifikacijeApiActions.procitajSveNeuspelo, (stanje): NotifikacijeState => ({
      ...stanje,
      greska: 'Obaveštenja nisu označena kao pročitana. Pokušaj ponovo.',
    })),
  ),
  extraSelectors: ({ selectLinkovi }) => ({
    selectOdeljciNeprocitanih: createSelector(
      selectLinkovi,
      (linkovi) => new Set(Object.keys(linkovi).map(odeljakLinka)),
    ),
  }),
});
