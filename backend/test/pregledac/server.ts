import { createServer, type Server } from 'node:http';
import { pokreniAplikaciju, type TestAplikacija } from '../pomoc/aplikacija.js';
import { LOZINKA, napraviSvet } from '../pomoc/podaci.js';
import { napraviBazu, PREFIKS_TEST_BAZE } from '../pomoc/test-baza.js';

const PORT_API = 3100;
const PORT_POMOCI = 3101;
const FRONTEND = 'http://localhost:4300';

const imeBaze = `${PREFIKS_TEST_BAZE}${process.pid}`;
const obrisiBazu = await napraviBazu(imeBaze);
process.env.DATABASE_NAME = imeBaze;
process.env.FRONTEND_URL = FRONTEND;

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
    if (zahtev.method === 'GET' && adresa.pathname === '/svet') {
      posalji(200, { lozinka: LOZINKA, ...svet });
    } else if (zahtev.method === 'GET' && adresa.pathname === '/mejl') {
      const mejl = aplikacija.posta
        .za(adresa.searchParams.get('za') ?? '')
        .at(-1);
      posalji(mejl ? 200 : 404, mejl);
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

try {
  t = await pokreniAplikaciju({ port: PORT_API });
  const server = napraviPomoc(t, await napraviSvet(t));
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject).listen(PORT_POMOCI, '127.0.0.1', resolve);
  });
  pomoc = server;
} catch (greska) {
  console.error(greska);
  await zavrsi(1);
}

console.log(`Server za e2e: ${imeBaze}, API ${PORT_API}, pomoć ${PORT_POMOCI}`);
