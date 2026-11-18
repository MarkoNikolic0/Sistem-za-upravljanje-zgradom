import { readFileSync } from 'node:fs';
import { expect, Page, test } from '@playwright/test';
import { popuniPrijavu } from './pomoc/prijava';
import { ucitajSvet } from './pomoc/svet';

interface Slika {
  src: string;
  sizes: string;
  purpose?: string;
  form_factor?: 'narrow' | 'wide';
}

interface Manifest {
  id: string;
  start_url: string;
  scope: string;
  display: string;
  icons: Slika[];
  screenshots: Slika[];
  shortcuts: { url: string; icons: Slika[] }[];
}

function dimenzije(page: Page, src: string) {
  return page.evaluate(
    (adresa) =>
      new Promise<string>((resolve, reject) => {
        const slika = new Image();
        slika.onload = () => resolve(`${slika.naturalWidth}x${slika.naturalHeight}`);
        slika.onerror = () => reject(new Error(`Slika ${adresa} se ne učitava.`));
        slika.src = adresa;
      }),
    src,
  );
}

test('manifest ima ikone, snimke i prečice tačnih dimenzija', async ({ page, request }) => {
  await page.goto('/login');
  const odgovor = await request.get('/manifest.webmanifest');
  expect(odgovor.ok()).toBe(true);
  const manifest = (await odgovor.json()) as Manifest;

  expect(manifest).toMatchObject({ id: '/', start_url: '/', scope: '/', display: 'standalone' });
  expect(manifest.icons.map((ikona) => `${ikona.sizes} ${ikona.purpose}`)).toEqual(
    expect.arrayContaining(['192x192 any', '512x512 any', '512x512 maskable']),
  );
  expect(manifest.screenshots.map((snimak) => snimak.form_factor)).toEqual(
    expect.arrayContaining(['narrow', 'wide']),
  );
  expect(manifest.shortcuts.length).toBeGreaterThan(0);

  const slike = [
    ...manifest.icons,
    ...manifest.screenshots,
    ...manifest.shortcuts.flatMap((precica) => precica.icons),
    { src: 'icons/apple-touch-icon.png', sizes: '180x180' },
    { src: 'icons/badge-96x96.png', sizes: '96x96' },
    { src: 'favicon.ico', sizes: '32x32' },
  ];
  for (const slika of slike) {
    expect(await dimenzije(page, `/${slika.src}`), slika.src).toBe(slika.sizes);
  }
  for (const snimak of manifest.screenshots) {
    const [sirina, visina] = snimak.sizes.split('x').map(Number);
    expect(snimak.form_factor === 'wide' ? sirina > visina : visina > sirina, snimak.src).toBe(
      true,
    );
  }
  expect(await dimenzije(page, '/favicon.svg')).toMatch(/^\d+x\d+$/);
});

const SPOLJNA = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

test('index.html i build ne učitavaju ništa sa spoljnih servera', async ({ request }) => {
  const html = await (await request.get('/index.html')).text();
  const adrese = [
    ...[...html.matchAll(/(?:src|href|content)="([^"]*)"/g)].map(([, adresa]) => adresa),
    ...[...html.matchAll(/srcset="([^"]*)"/g)].flatMap(([, spisak]) =>
      spisak.split(',').map((deo) => deo.trim().split(/\s+/)[0]),
    ),
    ...[...html.matchAll(/url\(\s*['"]?([^'")]+)/g)].map(([, adresa]) => adresa),
  ];
  expect(adrese.length).toBeGreaterThan(0);
  expect(adrese.filter((adresa) => SPOLJNA.test(adresa) && !adresa.startsWith('data:'))).toEqual(
    [],
  );

  const angular = JSON.parse(readFileSync('angular.json', 'utf8')) as {
    projects: Record<string, { architect: { build: { options: Record<string, unknown> } } }>;
  };
  const build = Object.values(angular.projects)[0].architect.build.options;
  const fajlovi = [build['styles'], build['scripts']]
    .flatMap((spisak) => (Array.isArray(spisak) ? spisak : []))
    .map((fajl: string | { input: string }) => (typeof fajl === 'string' ? fajl : fajl.input));
  expect(fajlovi.filter((fajl) => SPOLJNA.test(fajl))).toEqual([]);
});

test('prečica vodi neprijavljenog na prijavu pa na obaveštenja', async ({ page }) => {
  const { a } = await ucitajSvet();
  await page.goto('/notifikacije');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fnotifikacije$/);
  await popuniPrijavu(page, a.vlasnik.email);
  await expect(page.getByRole('heading', { name: 'Obaveštenja', level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/\/notifikacije$/);
});

test('bez mreže se pojavi poruka, a kad se veza vrati nestane', async ({ page, context }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Prijavi se' })).toBeVisible();
  const poruka = page.getByRole('status').getByText('Nema mreže.');
  await expect(poruka).toBeHidden();

  await context.setOffline(true);
  await expect(poruka).toBeVisible();

  await context.setOffline(false);
  await expect(poruka).toBeHidden();
});

test('poruka se pojavi i kad je mreža tu, a server ne odgovara', async ({ page }) => {
  const { a } = await ucitajSvet();
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Prijavi se' })).toBeVisible();
  await page.route('**/auth/login', (ruta) => ruta.abort('internetdisconnected'));
  await popuniPrijavu(page, a.vlasnik.email);
  const poruka = page.getByRole('status').getByText('Nema mreže.');
  await expect(poruka).toBeVisible();

  await page.unroute('**/auth/login');
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await expect(poruka).toBeHidden();
});
