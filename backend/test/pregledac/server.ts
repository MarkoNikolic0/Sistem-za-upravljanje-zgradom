import { createServer } from 'node:http';
import { pokreniAplikaciju } from '../pomoc/aplikacija.js';
import { LOZINKA, napraviSvet } from '../pomoc/podaci.js';
import { napraviBazu, PREFIKS_TEST_BAZE } from '../pomoc/test-baza.js';

const PORT_API = 3100;
const PORT_POMOCI = 3101;
const FRONTEND = 'http://localhost:4300';

const imeBaze = `${PREFIKS_TEST_BAZE}${process.pid}`;
const obrisiBazu = await napraviBazu(imeBaze);
process.env.DATABASE_NAME = imeBaze;
process.env.FRONTEND_URL = FRONTEND;

const t = await pokreniAplikaciju({ port: PORT_API });
const svet = await napraviSvet(t);

const pomoc = createServer((zahtev, odgovor) => {
  const adresa = new URL(zahtev.url ?? '/', `http://localhost:${PORT_POMOCI}`);
  const posalji = (status: number, telo?: unknown) => {
    odgovor.writeHead(status, { 'Content-Type': 'application/json' });
    odgovor.end(telo === undefined ? undefined : JSON.stringify(telo));
  };
  if (zahtev.method === 'GET' && adresa.pathname === '/svet') {
    posalji(200, { lozinka: LOZINKA, ...svet });
  } else if (zahtev.method === 'GET' && adresa.pathname === '/mejl') {
    const mejl = t.posta.za(adresa.searchParams.get('za') ?? '').at(-1);
    posalji(mejl ? 200 : 404, mejl);
  } else if (zahtev.method === 'POST' && adresa.pathname === '/kraj') {
    posalji(204);
    void zaustavi();
  } else {
    posalji(404);
  }
});
pomoc.listen(PORT_POMOCI, '127.0.0.1');

let zaustavljanje: Promise<void> | undefined;
function zaustavi() {
  zaustavljanje ??= (async () => {
    pomoc.close();
    await t.app.close();
    await obrisiBazu();
    process.exit(0);
  })();
  return zaustavljanje;
}

process.on('SIGINT', () => void zaustavi());
process.on('SIGTERM', () => void zaustavi());

console.log(`Server za e2e: ${imeBaze}, API ${PORT_API}, pomoć ${PORT_POMOCI}`);
