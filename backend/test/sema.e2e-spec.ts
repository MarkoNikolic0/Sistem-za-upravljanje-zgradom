import { getMetadataArgsStorage } from 'typeorm';
import { pokreniAplikaciju, type TestAplikacija } from './pomoc/aplikacija.js';

describe('šema baze', () => {
  let t: TestAplikacija;

  beforeAll(async () => {
    t = await pokreniAplikaciju();
  });

  afterAll(async () => {
    await t?.app.close();
  });

  it('svaki entitet iz koda ima tabelu u bazi', () => {
    const entiteti = getMetadataArgsStorage()
      .tables.filter(({ type }) => type === 'regular')
      .map(({ target }) => target);
    expect(entiteti.length).toBeGreaterThan(0);
    const bezTabele = entiteti
      .filter((entitet) => !t.baza.hasMetadata(entitet))
      .map((entitet) =>
        typeof entitet === 'function' ? entitet.name : entitet,
      );
    expect(bezTabele).toEqual([]);
  });
});
