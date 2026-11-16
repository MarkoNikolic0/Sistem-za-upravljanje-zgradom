import { IME_BAZE } from './okruzenje.js';
import { createServer, type Server } from 'node:http';
import { Zgrada } from '../../src/zgrada/zgrada.entity.js';
import { pokreniAplikaciju, type TestAplikacija } from '../pomoc/aplikacija.js';
import {
  dodeliZgradu,
  LOZINKA,
  napraviKorisnika,
  napraviSvet,
  napraviZgradu,
  napraviZgraduSaLjudima,
} from '../pomoc/podaci.js';
import { napraviBazu } from '../pomoc/test-baza.js';

const PORT_API = 3100;
const PORT_POMOCI = 3101;
const PROSLO = {
  sastanak: `UPDATE sastanak SET pocetak = now() - interval '1 hour' WHERE id = $1 RETURNING id`,
  glasanje: `UPDATE glasanje SET rok = now() - interval '1 second' WHERE id = $1 RETURNING id`,
};
const RUTA_PROSLO = new RegExp(
  `^/(${Object.keys(PROSLO).join('|')})/(\\d+)/proslo$`,
);

const obrisiBazu = await napraviBazu(IME_BAZE);

let t: TestAplikacija | undefined;
let pomoc: Server | undefined;
let ciscenje: Promise<void> | undefined;

function pocisti() {
  ciscenje ??= (async () => {
    if (pomoc?.listening) {
      pomoc.close();
    }
    await t?.app.close();
    await obrisiBazu();
  })();
  return ciscenje;
}

async function zavrsi(kod: number) {
  await pocisti();
  process.exit(kod);
}

process.on('SIGINT', () => void zavrsi(0));
process.on('SIGTERM', () => void zavrsi(0));

async function pomeriUProslost(
  aplikacija: TestAplikacija,
  vrsta: keyof typeof PROSLO,
  id: number,
) {
  const [{ broj }] = (await aplikacija.baza.query(
    `WITH promenjeni AS (${PROSLO[vrsta]}) SELECT count(*)::int AS broj FROM promenjeni`,
    [id],
  )) as { broj: number }[];
  return broj > 0;
}

function napraviPomoc(aplikacija: TestAplikacija, svet: object) {
  return createServer((zahtev, odgovor) => {
    const adresa = new URL(
      zahtev.url ?? '/',
      `http://localhost:${PORT_POMOCI}`,
    );
    const posalji = (status: number, telo?: unknown) => {
      odgovor.writeHead(status, { 'Content-Type': 'application/json' });
      odgovor.end(telo === undefined ? undefined : JSON.stringify(telo));
    };
    const proslo = RUTA_PROSLO.exec(adresa.pathname);
    if (zahtev.method === 'GET' && adresa.pathname === '/svet') {
      posalji(200, { lozinka: LOZINKA, ...svet });
    } else if (zahtev.method === 'GET' && adresa.pathname === '/mejl') {
      const mejl = aplikacija.posta
        .za(adresa.searchParams.get('za') ?? '')
        .at(-1);
      posalji(mejl ? 200 : 404, mejl);
    } else if (zahtev.method === 'POST' && proslo) {
      pomeriUProslost(
        aplikacija,
        proslo[1] as keyof typeof PROSLO,
        Number(proslo[2]),
      ).then(
        (pomeren) => posalji(pomeren ? 204 : 404),
        (greska: unknown) => posalji(500, String(greska)),
      );
    } else if (zahtev.method === 'POST' && adresa.pathname === '/kraj') {
      pocisti().then(
        () => odgovor.writeHead(204).end(() => process.exit(0)),
        (greska: unknown) => {
          console.error(greska);
          odgovor.writeHead(500).end(() => process.exit(1));
        },
      );
    } else {
      posalji(404);
    }
  });
}

async function napraviUpravnikaDveZgrade(aplikacija: TestAplikacija) {
  const prva = await napraviZgraduSaLjudima(aplikacija, 'Epsilon');
  const druga = await napraviZgraduSaLjudima(aplikacija, 'Zeta');
  await dodeliZgradu(aplikacija, prva.upravnik, druga.id);
  return { upravnik: prva.upravnik, zgrade: [prva.id, druga.id] };
}

async function napraviArhiviranuZgradu(aplikacija: TestAplikacija) {
  const { id } = await napraviZgradu(aplikacija, 'Arhiva');
  await aplikacija.baza
    .getRepository(Zgrada)
    .update(id, { arhivirana: new Date() });
  return id;
}

try {
  t = await pokreniAplikaciju({ port: PORT_API });
  const svet = {
    ...(await napraviSvet(t)),
    zaboravni: await napraviKorisnika(t, 'Zaboravni'),
    promenaLozinke: await napraviKorisnika(t, 'PromenaLozinke'),
    dveZgrade: await napraviUpravnikaDveZgrade(t),
    arhiviranaZgrada: await napraviArhiviranuZgradu(t),
  };
  const server = napraviPomoc(t, svet);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject).listen(PORT_POMOCI, '127.0.0.1', resolve);
  });
  pomoc = server;
} catch (greska) {
  console.error(greska);
  await zavrsi(1);
}

console.log(
  `Server za e2e: ${IME_BAZE}, API ${PORT_API}, pomoć ${PORT_POMOCI}`,
);
