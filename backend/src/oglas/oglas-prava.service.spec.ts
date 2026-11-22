import { ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { KorisnikService } from '../korisnik/korisnik.service.js';
import type { PristupZgradama } from '../korisnik/pristup-zgradama.js';
import { VrstaOglasa } from '../shared/enums/vrsta-oglasa.enum.js';
import { OglasPravaService } from './oglas-prava.service.js';
import type { Oglas } from './oglas.entity.js';

const pristup = (polja: Partial<PristupZgradama>): PristupZgradama => ({
  stanuje: [],
  poseduje: [],
  vlasnickiStanovi: [],
  zgrade: [],
  upravlja: [],
  ...polja,
});

const oglas = (autorId: number, zgradaId: number) =>
  ({ autor: { id: autorId }, zgrada: { id: zgradaId } }) as Oglas;

const zgradeUslova = (uslov: object) =>
  (uslov as { zgrada: { id: { value: number[] } } }).zgrada.id.value;

describe('OglasPravaService', () => {
  const prava = new OglasPravaService(
    {} as Repository<Oglas>,
    {} as KorisnikService,
  );

  describe('usloviVidljivosti', () => {
    it('stanar bez zgrade ne vidi ništa', () => {
      expect(prava.usloviVidljivosti(1, pristup({}), {} as never)).toEqual([]);
    });

    it('stanar vidi aktivne oglase i svoje, a upravnik i sve u svojim zgradama', () => {
      const stanar = prava.usloviVidljivosti(
        1,
        pristup({ zgrade: [5] }),
        {} as never,
      );
      expect(stanar).toHaveLength(2);
      expect(stanar[1]).toMatchObject({ autor: { id: 1 } });

      const upravnik = prava.usloviVidljivosti(
        2,
        pristup({ zgrade: [5, 6], upravlja: [6] }),
        {} as never,
      );
      expect(upravnik).toHaveLength(3);
      expect(zgradeUslova(upravnik[2])).toEqual([6]);
    });

    it('filter zgrade i vrste sužava uslove, a tuđa zgrada ne daje ništa', () => {
      const p = pristup({ zgrade: [5, 6], upravlja: [6] });
      const uslovi = prava.usloviVidljivosti(2, p, {
        zgradaId: 5,
        vrsta: VrstaOglasa.PRODAJA,
      } as never);
      expect(uslovi).toHaveLength(2);
      expect(uslovi.map(zgradeUslova)).toEqual([[5], [5]]);
      expect(uslovi.every((u) => u.vrsta === VrstaOglasa.PRODAJA)).toBe(true);
      expect(prava.usloviVidljivosti(2, p, { zgradaId: 9 } as never)).toEqual(
        [],
      );
    });
  });

  describe('smeDaSakrije', () => {
    it('samo upravnik zgrade, i to tuđ oglas', () => {
      const upravnik = pristup({ zgrade: [5], upravlja: [5] });
      expect(prava.smeDaSakrije(oglas(1, 5), 2, upravnik)).toBe(true);
      expect(prava.smeDaSakrije(oglas(2, 5), 2, upravnik)).toBe(false);
      expect(prava.smeDaSakrije(oglas(1, 6), 2, upravnik)).toBe(false);
      expect(prava.smeDaSakrije(oglas(1, 5), 3, pristup({ zgrade: [5] }))).toBe(
        false,
      );
    });
  });

  describe('smeDaObrise', () => {
    it('autor uvek, a upravnik zgrade samo sakriven oglas', () => {
      const upravnik = pristup({ zgrade: [5], upravlja: [5] });
      const sakriven = (autorId: number, zgradaId: number) =>
        Object.assign(oglas(autorId, zgradaId), {
          datumSakrivanja: new Date(),
        });
      const aktivan = (autorId: number, zgradaId: number) =>
        Object.assign(oglas(autorId, zgradaId), { datumSakrivanja: null });
      expect(prava.smeDaObrise(aktivan(2, 5), 2, pristup({}))).toBe(true);
      expect(prava.smeDaObrise(sakriven(2, 5), 2, pristup({}))).toBe(true);
      expect(prava.smeDaObrise(aktivan(1, 5), 2, upravnik)).toBe(false);
      expect(prava.smeDaObrise(sakriven(1, 5), 2, upravnik)).toBe(true);
      expect(prava.smeDaObrise(sakriven(1, 6), 2, upravnik)).toBe(false);
      expect(
        prava.smeDaObrise(sakriven(1, 5), 3, pristup({ zgrade: [5] })),
      ).toBe(false);
    });
  });

  describe('proveriVrstu', () => {
    it('obaveštenje objavljuje samo upravnik te zgrade, ostale vrste svi', () => {
      const upravnik = pristup({ zgrade: [5, 6], upravlja: [5] });
      expect(() =>
        prava.proveriVrstu(VrstaOglasa.OBAVESTENJE, upravnik, 5),
      ).not.toThrow();
      expect(() =>
        prava.proveriVrstu(VrstaOglasa.OBAVESTENJE, upravnik, 6),
      ).toThrow(ForbiddenException);
      expect(() =>
        prava.proveriVrstu(VrstaOglasa.PRODAJA, upravnik, 6),
      ).not.toThrow();
    });
  });
});
