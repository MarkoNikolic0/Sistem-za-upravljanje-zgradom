import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { podesiAplikaciju } from '../../src/podesi-aplikaciju.js';
import { MailService } from '../../src/shared/mail/mail.service.js';
import { SkladisteService } from '../../src/shared/skladiste/skladiste.service.js';
import { LaznaPosta, LaznoSkladiste } from './lazni-servisi.js';
import { PREFIKS_TEST_BAZE } from './test-baza.js';

type App = Parameters<typeof request>[0];

const PORUKA_BAZA = `Testovi rade samo nad bazom koja počinje sa ${PREFIKS_TEST_BAZE}.`;

export interface TestAplikacija {
  app: INestApplication<App>;
  server: App;
  baza: DataSource;
  posta: LaznaPosta;
  skladiste: LaznoSkladiste;
}

export interface Akter {
  id: number;
  email: string;
  token: string;
}

export async function pokreniAplikaciju({ ogranicenjeZahteva = false } = {}) {
  if (!process.env.DATABASE_NAME?.startsWith(PREFIKS_TEST_BAZE)) {
    throw new Error(PORUKA_BAZA);
  }
  const posta = new LaznaPosta();
  const skladiste = new LaznoSkladiste();
  const graditelj = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(posta)
    .overrideProvider(SkladisteService)
    .useValue(skladiste);
  if (!ogranicenjeZahteva) {
    graditelj.overrideGuard(ThrottlerGuard).useValue({
      canActivate: () => true,
    });
  }
  const modul = await graditelj.compile();
  const app = modul.createNestApplication<INestApplication<App>>();
  podesiAplikaciju(app);
  await app.listen(0);
  const baza = app.get(DataSource);
  if (!String(baza.options.database).startsWith(PREFIKS_TEST_BAZE)) {
    await app.close();
    throw new Error(PORUKA_BAZA);
  }
  const t: TestAplikacija = {
    app,
    server: app.getHttpServer(),
    baza,
    posta,
    skladiste,
  };
  return t;
}

export type Metoda = 'get' | 'post' | 'put' | 'patch' | 'delete';

export function kao(t: TestAplikacija, akter?: Akter) {
  const posalji = (metoda: Metoda) => (putanja: string) => {
    const zahtev = request(t.server)[metoda](putanja);
    return akter
      ? zahtev.set('Authorization', `Bearer ${akter.token}`)
      : zahtev;
  };
  return {
    get: posalji('get'),
    post: posalji('post'),
    put: posalji('put'),
    patch: posalji('patch'),
    delete: posalji('delete'),
  };
}
