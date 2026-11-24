import { expect, test } from '@playwright/test';
import { prijavi } from './pomoc/prijava';
import { ucitajSvet } from './pomoc/svet';

const PDF = {
  name: 'kucni-red.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n'),
};

test.describe.serial('dokumenti zgrade', () => {
  let svima = '';
  let vlasnicima = '';
  test.beforeAll(() => {
    svima = `Kućni red ${Date.now()}`;
    vlasnicima = `Ugovor o održavanju ${Date.now()}`;
  });

  const okaci = async (
    page: import('@playwright/test').Page,
    naziv: string,
    kategorija: string,
    samoVlasnici: boolean,
  ) => {
    await page.locator('#dodaj-dokument').click();
    await page.locator('app-forma-dokumenta input[type="file"]').setInputFiles(PDF);
    await page.getByLabel('Naziv').fill(naziv);
    await page.getByText(kategorija, { exact: true }).click();
    await page.getByText(samoVlasnici ? 'Samo vlasnici' : 'Svi stanari', { exact: true }).click();
    await page
      .locator('app-forma-dokumenta')
      .getByRole('button', { name: 'Okači dokument' })
      .click();
    await expect(page.getByRole('link', { name: new RegExp(naziv) })).toBeVisible();
  };

  test('upravnik okači dokument za sve i dokument samo za vlasnike', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.upravnik.email);
    await page.goto('/dokumenti');
    await expect(page.getByRole('heading', { level: 1, name: 'Dokumenti' })).toBeVisible();
    await okaci(page, svima, 'Pravila i kućni red', false);
    await okaci(page, vlasnicima, 'Ugovori', true);
  });

  test('vlasnik vidi oba dokumenta, a ukućanin samo onaj za sve', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.vlasnik.email);
    await page.goto('/dokumenti');
    await expect(page.getByRole('link', { name: new RegExp(svima) })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(vlasnicima) })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Okači dokument' })).toHaveCount(0);

    await page.context().clearCookies();
    await prijavi(page, a.ukucanin.email);
    await page.goto('/dokumenti');
    await expect(page.getByRole('link', { name: new RegExp(svima) })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(vlasnicima) })).toHaveCount(0);
  });

  test('stanar druge zgrade ne vidi dokumente', async ({ page }) => {
    const { b } = await ucitajSvet();
    await prijavi(page, b.vlasnik.email);
    await page.goto('/dokumenti');
    await expect(page.getByRole('heading', { level: 1, name: 'Dokumenti' })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(svima) })).toHaveCount(0);
  });
});

test.describe.serial('važni kontakti', () => {
  let naziv = '';
  test.beforeAll(() => {
    naziv = `Domar Pera ${Date.now()}`;
  });

  test('upravnik doda kontakt', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.upravnik.email);
    await page.goto('/kontakti');
    await page.locator('#dodaj-kontakt').click();
    await page.getByLabel('Naziv').fill(naziv);
    await page.getByRole('textbox', { name: 'Uloga' }).fill('Domar');
    await page.getByLabel('Telefon').fill('0641234567');
    await page.locator('app-forma-kontakta').getByRole('button', { name: 'Dodaj kontakt' }).click();
    await expect(page.getByRole('link', { name: new RegExp(`Pozovi ${naziv}`) })).toBeVisible();
  });

  test('stanar vidi kontakt na početnoj i zove ga jednim dodirom', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.vlasnik.email);
    const poziv = page.getByRole('link', { name: new RegExp(`Pozovi ${naziv}`) });
    await expect(poziv).toBeVisible();
    await expect(poziv).toHaveAttribute('href', /^tel:.*641234567$/);
  });

  test('stanar druge zgrade ne vidi kontakt', async ({ page }) => {
    const { b } = await ucitajSvet();
    await prijavi(page, b.vlasnik.email);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(`Pozovi ${naziv}`) })).toHaveCount(0);
  });

  test('upravnik izmeni pa obriše kontakt', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.upravnik.email);
    await page.goto('/kontakti');
    await page.getByRole('button', { name: `Izmeni ${naziv}` }).click();
    await page.getByRole('textbox', { name: 'Uloga' }).fill('Domar zgrade');
    await page.getByRole('button', { name: 'Sačuvaj izmene' }).click();
    await expect(page.getByText('Domar zgrade', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: `Obriši ${naziv}` }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: /Obriši/ })
      .click();
    await expect(page.getByRole('link', { name: new RegExp(`Pozovi ${naziv}`) })).toHaveCount(0);
  });
});
