import { expect, test } from '@playwright/test';
import { prijavi } from './pomoc/prijava';
import { pomeriUProslost, ucitajSvet } from './pomoc/svet';

test.describe.serial('oglas', () => {
  let naslov = '';
  test.beforeAll(() => {
    naslov = `Prodajem dečiji bicikl ${Date.now()}`;
  });

  test('stanar objavi oglas', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.vlasnik.email);
    await page.getByRole('navigation').getByRole('link', { name: 'Oglasi' }).click();
    await page.getByRole('link', { name: 'Objavi oglas' }).click();
    await page.getByRole('combobox', { name: 'Vrsta oglasa' }).click();
    await page.getByRole('option', { name: 'Prodajem / poklanjam' }).click();
    await page.getByLabel('Naslov').fill(naslov);
    await page.getByLabel('Tekst').fill('Malo korišćen, za uzrast od 5 do 8 godina.');
    await page.getByRole('button', { name: 'Objavi oglas' }).click();
    await expect(page).toHaveURL(/\/oglasi$/);
    await expect(page.getByRole('heading', { name: naslov })).toBeVisible();
  });

  test('komšija vidi oglas, ali ne može da ga menja', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.sused.email);
    await page.goto('/oglasi');
    const oglas = page.getByRole('article').filter({ hasText: naslov });
    await expect(oglas).toBeVisible();
    await expect(oglas.getByRole('button', { name: /Izmeni|Obriši/ })).toHaveCount(0);
  });

  test('autor menja istekao oglas bez novog roka', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.vlasnik.email);
    await page.goto('/oglasi');
    const oglas = page.getByRole('article').filter({ hasText: naslov });
    const izmena = await oglas.getByRole('link', { name: 'Izmeni' }).getAttribute('href');
    await pomeriUProslost('oglas', Number(/\/oglasi\/(\d+)\/izmena/.exec(izmena ?? '')?.[1]));

    await page.reload();
    await expect(oglas.getByText('Istekao', { exact: true })).toBeVisible();
    await oglas.getByRole('link', { name: 'Izmeni' }).click();
    await expect(page.getByLabel('Tekst')).toHaveValue(/Malo korišćen/);
    await page.getByLabel('Tekst').fill('Malo korišćen, sa kacigom.');
    await page.getByRole('button', { name: 'Sačuvaj izmene' }).click();
    await expect(page.getByText('Oglas je izmenjen.')).toBeVisible();
    await expect(oglas.getByText('Malo korišćen, sa kacigom.')).toBeVisible();
    await expect(oglas.getByText('Istekao', { exact: true })).toBeVisible();
  });

  test('stanar druge zgrade ne vidi oglas', async ({ page }) => {
    const { b } = await ucitajSvet();
    await prijavi(page, b.vlasnik.email);
    await page.goto('/oglasi');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: naslov })).toHaveCount(0);
  });
});
