import {
  type Akter,
  kao,
  type Metoda,
  type TestAplikacija,
} from './aplikacija.js';

export function zahtevZaRutu(
  t: TestAplikacija,
  ruta: string,
  akter?: Akter,
  putanja = ruta.split(' ')[1],
) {
  const metoda = ruta.split(' ')[0].toLowerCase() as Metoda;
  return kao(t, akter)[metoda](putanja);
}

interface SlojRutera {
  route?: { path: string; methods: Record<string, boolean> };
}

export function sveRute(t: TestAplikacija): string[] {
  const express = t.app.getHttpAdapter().getInstance() as {
    router: { stack: SlojRutera[] };
  };
  return express.router.stack.flatMap(({ route }) =>
    route
      ? Object.keys(route.methods).map(
          (metoda) => `${metoda.toUpperCase()} ${route.path}`,
        )
      : [],
  );
}

export async function otisakBaze(t: TestAplikacija) {
  const upit = t.baza.entityMetadatas
    .map(
      ({ tableName }) =>
        `SELECT '${tableName}' AS tabela, COUNT(*)::int AS redova, md5(COALESCE(string_agg(md5(red::text), '' ORDER BY md5(red::text)), '')) AS otisak FROM "${tableName}" red`,
    )
    .join(' UNION ALL ');
  const redovi: { tabela: string; redova: number; otisak: string }[] =
    await t.baza.query(upit);
  return Object.fromEntries(
    redovi.map(({ tabela, redova, otisak }) => [
      tabela,
      `${redova} redova, ${otisak}`,
    ]),
  );
}
