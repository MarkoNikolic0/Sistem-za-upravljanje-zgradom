/// <reference types="node" />
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { AuraKomponente } from './aura-komponente';

const MODULI = 'node_modules';

const uvoz = (paket: string) => new RegExp(`from ['"]${paket}/([a-z]+)['"]`, 'g');

function fajloviAplikacije(folder: string): string[] {
  return readdirSync(folder).flatMap((ime) => {
    const putanja = join(folder, ime);
    return statSync(putanja).isDirectory() ? fajloviAplikacije(putanja) : [putanja];
  });
}

function stiloviKomponenti(): Set<string> {
  const stilovi = new Set<string>();
  const posecene = new Set<string>();
  const obidji = (modul: string) => {
    if (posecene.has(modul)) {
      return;
    }
    posecene.add(modul);
    const izvor = readFileSync(join(MODULI, 'primeng/fesm2022', `primeng-${modul}.mjs`), 'utf8');
    for (const [, stil] of izvor.matchAll(uvoz('@primeuix/styles'))) {
      stilovi.add(stil);
    }
    for (const [, zavisnost] of izvor.matchAll(uvoz('primeng'))) {
      obidji(zavisnost);
    }
  };
  for (const fajl of fajloviAplikacije('src/app').filter((f) => f.endsWith('.ts'))) {
    for (const [, modul] of readFileSync(fajl, 'utf8').matchAll(uvoz('primeng'))) {
      obidji(modul);
    }
  }
  return stilovi;
}

describe('AuraKomponente', () => {
  it('ima tokene za svaku PrimeNG komponentu koju aplikacija koristi', () => {
    const potrebne = [...stiloviKomponenti()].filter(
      (stil) => stil !== 'base' && existsSync(join(MODULI, '@primeuix/themes/dist/aura', stil)),
    );
    expect(potrebne.length).toBeGreaterThan(0);
    const nedostaju = potrebne.filter((stil) => !(stil in AuraKomponente.components));
    expect(nedostaju).toEqual([]);
  });
});
