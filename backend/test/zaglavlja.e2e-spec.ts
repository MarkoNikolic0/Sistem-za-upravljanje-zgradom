import request from 'supertest';
import { pokreniAplikaciju, type TestAplikacija } from './pomoc/aplikacija.js';

describe('bezbednosna zaglavlja', () => {
  let t: TestAplikacija;

  beforeAll(async () => {
    t = await pokreniAplikaciju();
  });

  afterAll(async () => {
    await t?.app.close();
  });

  it('odgovor ne otkriva server i zabranjuje pogađanje tipa i ugrađivanje u tuđu stranicu', async () => {
    const odgovor = await request(t.server).post('/auth/refresh').expect(401);

    expect(odgovor.headers['x-powered-by']).toBeUndefined();
    expect(odgovor.headers['x-content-type-options']).toBe('nosniff');
    expect(odgovor.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(odgovor.headers['content-security-policy']).toContain(
      "frame-ancestors 'self'",
    );
    expect(odgovor.headers['strict-transport-security']).toContain('max-age=');
  });
});
