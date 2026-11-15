import type { PristupZgradama } from '../korisnik/pristup-zgradama.js';
import {
  IshodOdluke,
  VecinaOdluke,
  VrstaGlasanja,
} from '../shared/enums/glasanje.enums.js';
import type { Glasanje } from './glasanje.entity.js';
import { type PodaciGlasanja, prikazGlasanja } from './prikaz-glasanja.js';

const ZGRADA = 7;
const sada = new Date('2026-03-10T12:00:00Z');
const sutra = new Date('2026-03-11T12:00:00Z');
const juce = new Date('2026-03-09T12:00:00Z');

const anketa = (rok: Date) =>
  ({
    id: 1,
    vrsta: VrstaGlasanja.ANKETA,
    vecina: null,
    ukupnoStanova: null,
    rok,
    zgrada: { id: ZGRADA },
    opcije: [
      { id: 12, tekst: 'Zelena' },
      { id: 11, tekst: 'Siva' },
    ],
  }) as Glasanje;

const odluka = (rok: Date, vecina = VecinaOdluke.OBICNA) =>
  ({
    id: 2,
    vrsta: VrstaGlasanja.ODLUKA,
    vecina,
    ukupnoStanova: 10,
    rok,
    zgrada: { id: ZGRADA },
    opcije: [
      { id: 21, tekst: 'Za' },
      { id: 22, tekst: 'Protiv' },
      { id: 23, tekst: 'Uzdržan' },
    ],
  }) as Glasanje;

const pristup = (polja: Partial<PristupZgradama> = {}): PristupZgradama => ({
  stanuje: [],
  poseduje: [],
  vlasnickiStanovi: [],
  zgrade: [],
  upravlja: [],
  ...polja,
});

const podaci = (polja: Partial<PodaciGlasanja> = {}): PodaciGlasanja => ({
  brojPoOpciji: new Map(),
  mojGlasPoAnketi: new Map(),
  stanaraPoZgradi: new Map(),
  oglasPoOdluci: new Map(),
  glasoviStanova: [],
  sastanakPoOdluci: new Map(),
  ...polja,
});

const stanar = pristup({ stanuje: [ZGRADA], zgrade: [ZGRADA] });
const vlasnik = pristup({
  stanuje: [ZGRADA],
  poseduje: [ZGRADA],
  zgrade: [ZGRADA],
  vlasnickiStanovi: [{ id: 101, zgradaId: ZGRADA }],
});
const upravnik = pristup({ zgrade: [ZGRADA], upravlja: [ZGRADA] });

describe('prikazGlasanja — anketa', () => {
  const glasovi = podaci({
    brojPoOpciji: new Map([
      [11, 3],
      [12, 1],
    ]),
    stanaraPoZgradi: new Map([[ZGRADA, 9]]),
  });

  it('stanar koji nije glasao ne vidi rezultate, ali vidi koliko ih je glasalo', () => {
    const prikaz = prikazGlasanja(anketa(sutra), stanar, glasovi, sada);
    expect(prikaz.opcije).toEqual([
      { id: 11, tekst: 'Siva', brojGlasova: null },
      { id: 12, tekst: 'Zelena', brojGlasova: null },
    ]);
    expect(prikaz).toMatchObject({
      mojGlas: null,
      brojGlasaca: 4,
      ukupnoGlasaca: 9,
      smeDaGlasa: true,
      smeDaZatvori: false,
      smeDaObrise: false,
      ishod: null,
      pragovi: null,
    });
  });

  it('posle glasanja stanar vidi rezultate', () => {
    const prikaz = prikazGlasanja(
      anketa(sutra),
      stanar,
      { ...glasovi, mojGlasPoAnketi: new Map([[1, 11]]) },
      sada,
    );
    expect(prikaz.mojGlas).toBe(11);
    expect(prikaz).toMatchObject({
      opcije: [{ brojGlasova: 3 }, { brojGlasova: 1 }],
    });
  });

  it('upravnik vidi rezultate i sme da zatvori, ali bez stana ne glasa', () => {
    const prikaz = prikazGlasanja(anketa(sutra), upravnik, glasovi, sada);
    expect(prikaz).toMatchObject({
      opcije: [{ brojGlasova: 3 }, { brojGlasova: 1 }],
    });
    expect(prikaz).toMatchObject({
      smeDaGlasa: false,
      smeDaZatvori: true,
      smeDaObrise: true,
    });
  });

  it('posle roka svi vide rezultate i niko ne glasa', () => {
    const prikaz = prikazGlasanja(anketa(juce), stanar, glasovi, sada);
    expect(prikaz).toMatchObject({
      opcije: [{ brojGlasova: 3 }, { brojGlasova: 1 }],
    });
    expect(prikaz).toMatchObject({ zavrseno: true, smeDaGlasa: false });
  });
});

describe('prikazGlasanja — odluka', () => {
  const glasovi = podaci({
    brojPoOpciji: new Map([
      [21, 6],
      [22, 1],
    ]),
  });

  it('vlasnik čiji stan nije glasao sme da glasa i ne vidi rezultate', () => {
    const prikaz = prikazGlasanja(odluka(sutra), vlasnik, glasovi, sada);
    expect(prikaz).toMatchObject({
      smeDaGlasa: true,
      mojGlas: null,
      brojZa: null,
      brojGlasaca: 7,
      ukupnoGlasaca: 10,
      ishod: null,
      pragovi: { kvorum: 6, potrebnoZa: 4 },
    });
  });

  it('kad je za stan glasao suvlasnik, vlasnik vidi rezultate i više ne glasa', () => {
    const prikaz = prikazGlasanja(
      odluka(sutra),
      vlasnik,
      {
        ...glasovi,
        glasoviStanova: [
          { glasanjeId: 2, opcijaId: 21, stan: '5', moj: false },
        ],
      },
      sada,
    );
    expect(prikaz).toMatchObject({
      smeDaGlasa: false,
      mojGlas: null,
      glasaliSuvlasnici: ['5'],
      brojZa: 6,
    });
  });

  it('vlasnik koji je glasao može da promeni glas do roka', () => {
    const prikaz = prikazGlasanja(
      odluka(sutra),
      vlasnik,
      {
        ...glasovi,
        glasoviStanova: [{ glasanjeId: 2, opcijaId: 22, stan: '5', moj: true }],
      },
      sada,
    );
    expect(prikaz).toMatchObject({ smeDaGlasa: true, mojGlas: 22 });
  });

  it('upravnik ne može da zatvori odluku pre roka', () => {
    const prikaz = prikazGlasanja(odluka(sutra), upravnik, glasovi, sada);
    expect(prikaz).toMatchObject({ smeDaZatvori: false, smeDaObjavi: false });
  });

  it('posle roka daje ishod, a upravnik sme da objavi samo jednom', () => {
    const prikaz = prikazGlasanja(odluka(juce), upravnik, glasovi, sada);
    expect(prikaz).toMatchObject({
      ishod: IshodOdluke.USVOJENA,
      smeDaObjavi: true,
      oglasId: null,
    });

    const objavljena = prikazGlasanja(
      odluka(juce),
      upravnik,
      { ...glasovi, oglasPoOdluci: new Map([[2, 40]]) },
      sada,
    );
    expect(objavljena).toMatchObject({ smeDaObjavi: false, oglasId: 40 });
  });

  it('dvotrećinska većina se računa od svih stanova', () => {
    const prikaz = prikazGlasanja(
      odluka(juce, VecinaOdluke.DVE_TRECINE),
      upravnik,
      glasovi,
      sada,
    );
    expect(prikaz).toMatchObject({
      ishod: IshodOdluke.ODBIJENA,
      pragovi: { kvorum: 6, potrebnoZa: 7 },
    });
  });
});
