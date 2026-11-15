import { Action } from '@ngrx/store';
import { Notifikacija } from '../notifikacija-models';
import { NotifikacijeActions, NotifikacijeApiActions, VezaActions } from './notifikacije-actions';
import { notifikacijeFeature } from './notifikacije-reducer';

const { reducer } = notifikacijeFeature;

const notifikacija = (id: number, link: string | null = `/kvarovi/${id}`): Notifikacija => ({
  id,
  tip: 'kvar_status',
  tekst: `Obaveštenje ${id}`,
  link,
  procitano: false,
  datumKreiranja: '2026-06-10T10:00:00.000Z',
});

const stanje = (...akcije: Action[]) =>
  akcije.reduce((s, a) => reducer(s, a), reducer(undefined, { type: '@@init' }));

const neprocitane = NotifikacijeApiActions.neprocitaneUcitane({
  broj: 3,
  linkovi: {
    '/kvarovi/1': { broj: 2, tip: 'kvar_status' },
    '/sastanci/4': { broj: 1, tip: 'sastanak_novi' },
  },
});

describe('notifikacije reducer', () => {
  it('nova notifikacija povećava broj i dodaje link, osim kad je korisnik već na toj stranici', () => {
    const s = stanje(VezaActions.stigla({ notifikacija: notifikacija(5), naStranici: false }));
    expect(s.brojNeprocitanih).toBe(1);
    expect(s.linkovi['/kvarovi/5']).toEqual({ broj: 1, tip: 'kvar_status' });

    const naStranici = stanje(
      VezaActions.stigla({ notifikacija: notifikacija(5), naStranici: true }),
    );
    expect(naStranici.brojNeprocitanih).toBe(0);
    expect(naStranici.linkovi).toEqual({});
  });

  it('nova notifikacija ide na vrh učitane liste bez duplikata', () => {
    const s = stanje(
      NotifikacijeActions.listaOtvorena({ samoNeprocitane: false }),
      NotifikacijeApiActions.listaUcitana({ stranica: { stavke: [notifikacija(1)], ukupno: 1 } }),
      VezaActions.stigla({ notifikacija: notifikacija(2), naStranici: true }),
      VezaActions.stigla({ notifikacija: notifikacija(2), naStranici: true }),
    );
    expect(s.stavke.map((n) => [n.id, n.procitano])).toEqual([
      [2, true],
      [1, false],
    ]);
  });

  it('pre učitavanja lista ostaje prazna', () => {
    const s = stanje(VezaActions.stigla({ notifikacija: notifikacija(2), naStranici: false }));
    expect(s.stavke).toEqual([]);
  });

  it('starija obaveštenja se dopisuju na kraj i računa se koliko je ostalo', () => {
    const s = stanje(
      NotifikacijeActions.listaOtvorena({ samoNeprocitane: false }),
      NotifikacijeApiActions.listaUcitana({
        stranica: { stavke: [notifikacija(3), notifikacija(2)], ukupno: 5 },
      }),
      NotifikacijeActions.ucitajStarije(),
    );
    expect(s.preostaloStarijih).toBe(3);
    expect(s.ucitavaStarije).toBe(true);
    const posle = reducer(
      s,
      NotifikacijeApiActions.starijeUcitane({
        stranica: { stavke: [notifikacija(2), notifikacija(1)], ukupno: 3 },
      }),
    );
    expect(posle.stavke.map((n) => n.id)).toEqual([3, 2, 1]);
    expect(posle.preostaloStarijih).toBe(1);
    expect(posle.ucitavaStarije).toBe(false);
  });

  it('pročitana notifikacija smanjuje broj i broj na linku', () => {
    const s = stanje(
      neprocitane,
      NotifikacijeApiActions.procitana({ notifikacija: notifikacija(1) }),
    );
    expect(s.brojNeprocitanih).toBe(2);
    expect(s.linkovi['/kvarovi/1'].broj).toBe(1);
  });

  it('notifikacija čija je stranica već pročitana ne smanjuje broj drugi put', () => {
    const s = stanje(
      neprocitane,
      NotifikacijeApiActions.stranicaProcitana({ link: '/kvarovi/1' }),
      NotifikacijeApiActions.procitana({ notifikacija: notifikacija(1) }),
    );
    expect(s.brojNeprocitanih).toBe(1);
    expect(Object.keys(s.linkovi)).toEqual(['/sastanci/4']);
  });

  it('broj nikad ne ide ispod nule', () => {
    const s = stanje(NotifikacijeApiActions.procitana({ notifikacija: notifikacija(9, null) }));
    expect(s.brojNeprocitanih).toBe(0);
  });

  it('pročitaj sve i greška pri tome', () => {
    const s = stanje(neprocitane, NotifikacijeApiActions.procitajSveNeuspelo());
    expect(s.greska).not.toBeNull();
    const posle = stanje(
      neprocitane,
      NotifikacijeActions.procitajSve(),
      NotifikacijeApiActions.procitaneSve(),
    );
    expect(posle.brojNeprocitanih).toBe(0);
    expect(posle.linkovi).toEqual({});
    expect(posle.greska).toBeNull();
  });

  it('zatvaranje liste čuva broj neprocitanih, a odjava briše sve', () => {
    const otvorena = stanje(
      neprocitane,
      NotifikacijeActions.listaOtvorena({ samoNeprocitane: true }),
      NotifikacijeApiActions.listaUcitana({ stranica: { stavke: [notifikacija(1)], ukupno: 1 } }),
    );
    const zatvorena = reducer(otvorena, NotifikacijeActions.listaZatvorena());
    expect(zatvorena.stavke).toEqual([]);
    expect(zatvorena.status).toBe('pocetno');
    expect(zatvorena.brojNeprocitanih).toBe(3);
    expect(reducer(otvorena, VezaActions.zaustavi())).toEqual(stanje());
  });

  it('selektor odeljaka daje delove aplikacije sa neprocitanim', () => {
    const odeljci = notifikacijeFeature.selectOdeljciNeprocitanih.projector({
      '/kvarovi/1': { broj: 1, tip: 'kvar_status' },
      '/kvarovi/2': { broj: 1, tip: 'kvar_status' },
      '/glasanje': { broj: 1, tip: 'glasanje_novo' },
    });
    expect([...odeljci]).toEqual(['/kvarovi', '/glasanje']);
  });
});
