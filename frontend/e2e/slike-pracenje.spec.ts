import { expect, test } from '@playwright/test';
import { prijavi } from './pomoc/prijava';
import { ucitajSvet } from './pomoc/svet';

const SLIKA = {
  name: 'lift.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
};

test.describe.serial('slike i praćenje zajedničkog kvara', () => {
  let adresaKvara = '';
  let naslov = '';
  test.beforeAll(() => {
    naslov = `Lift staje između spratova ${Date.now()}`;
  });

  test('stanar prijavi kvar u zajedničkom prostoru i doda sliku', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.vlasnik.email);
    await page.goto('/kvarovi/novi');
    await page.getByText('Zajednički prostor', { exact: true }).click();
    await page.getByText('Lift', { exact: true }).click();
    await page.getByLabel('Naslov').fill(naslov);
    await page.getByLabel('Opis').fill('Od jutros staje između trećeg i četvrtog sprata.');
    await page.getByRole('button', { name: 'Prijavi kvar' }).click();
    await expect(page).toHaveURL(/\/kvarovi\/\d+$/);
    adresaKvara = new URL(page.url()).pathname;

    await page.locator('app-slike-kvara input[type="file"]').setInputFiles(SLIKA);
    await expect(page.getByRole('img', { name: /Slika 1 od 1/ })).toBeVisible();
  });

  test('komšija prati kvar, ne može da obriše tuđu sliku i može da prestane da prati', async ({
    page,
  }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.sused.email);
    await page.goto(adresaKvara);
    await expect(page.getByRole('heading', { name: naslov })).toBeVisible();
    await expect(page.getByRole('img', { name: /Slika 1 od 1/ })).toBeVisible();
    await expect(
      page.locator('app-slike-kvara').getByRole('button', { name: 'Obriši' }),
    ).toHaveCount(0);

    await page.getByRole('button', { name: 'I kod mene je, prati' }).click();
    await expect(page.getByRole('button', { name: 'Prestani da pratiš' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Prestani da pratiš' })).toBeVisible();

    await page.getByRole('button', { name: 'Prestani da pratiš' }).click();
    await expect(page.getByRole('button', { name: 'I kod mene je, prati' })).toBeVisible();
  });

  test('stanar druge zgrade ne vidi kvar ni sliku', async ({ page }) => {
    const { b } = await ucitajSvet();
    await prijavi(page, b.vlasnik.email);
    await page.goto(adresaKvara);
    await expect(page.getByText('Kvar ne postoji ili nemaš pristup njemu.')).toBeVisible();
    await expect(page.getByRole('img', { name: /Slika 1 od 1/ })).toHaveCount(0);
  });

  test('autor obriše svoju sliku', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.vlasnik.email);
    await page.goto(adresaKvara);
    await page.locator('app-slike-kvara').getByRole('button', { name: 'Obriši' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: /Obriši/ })
      .click();
    await expect(page.getByText('Još nema slika.')).toBeVisible();
  });
});
