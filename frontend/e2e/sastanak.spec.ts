import { expect, Page, test } from '@playwright/test';
import { prijavi } from './pomoc/prijava';
import { pomeriUProslost, ucitajSvet } from './pomoc/svet';

const ZAPISNIK = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);

async function zakazi(page: Page, naslov: string, vrsta?: string) {
  await page.goto('/sastanci');
  await page.getByRole('link', { name: 'Zakaži sastanak' }).click();
  if (vrsta) {
    await page.getByText(vrsta, { exact: true }).click();
  }
  await page.getByLabel('Naslov').fill(naslov);
  await page.getByLabel('Mesto').fill('Ulaz zgrade');
  await page.getByLabel('Tačka 1').fill('Zamena ulaznih vrata');
  await page.getByRole('button', { name: 'Zakaži sastanak' }).click();
  await expect(page).toHaveURL(/\/sastanci\/\d+$/);
  await expect(page.getByRole('heading', { name: naslov })).toBeVisible();
  return new URL(page.url()).pathname;
}

test.describe.serial('skupština', () => {
  let naslov = '';
  let adresa = '';
  test.beforeAll(() => {
    naslov = `Redovna skupština ${Date.now()}`;
  });

  test('upravnik zakaže skupštinu sa dnevnim redom', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.upravnik.email);
    adresa = await zakazi(page, naslov);
    await expect(page.getByText('Zamena ulaznih vrata')).toBeVisible();
  });

  test('vlasnik najavi dolazak', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.vlasnik.email);
    await page.goto(adresa);
    const dolazim = page.getByRole('button', { name: 'Dolazim', exact: true });
    await dolazim.click();
    await expect(dolazim).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/Dolazi\s*1\s*· ne dolazi\s*0/)).toBeVisible();
  });

  test('stanar druge zgrade ne vidi skupštinu', async ({ page }) => {
    const { b } = await ucitajSvet();
    await prijavi(page, b.vlasnik.email);
    await page.goto(adresa);
    await expect(page.getByText('Sastanak ne postoji ili nemaš pristup.')).toBeVisible();
    await expect(page.getByRole('heading', { name: naslov })).toHaveCount(0);
  });

  test('posle početka upravnik evidentira prisustvo i okači zapisnik', async ({ page }) => {
    const { a } = await ucitajSvet();
    await pomeriUProslost('sastanak', Number(adresa.split('/').at(-1)));
    await prijavi(page, a.upravnik.email);
    await page.goto(adresa);

    await expect(page.getByRole('checkbox', { name: /^Stan 1 / })).toBeChecked();
    await page.getByText('Stan 2', { exact: true }).click();
    await page.getByRole('button', { name: 'Sačuvaj evidenciju' }).click();
    await expect(page.getByText('Kvorum je utvrđen')).toBeVisible();

    await page.getByRole('button', { name: /Okači zapisnik/ }).click();
    const birac = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Izaberi fajl' }).click();
    await (
      await birac
    ).setFiles({ name: 'zapisnik.pdf', mimeType: 'application/pdf', buffer: ZAPISNIK });
    await page.getByRole('button', { name: 'Okači zapisnik', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Zapisnik' }).getByRole('link')).toBeVisible();
  });

  test('vlasnik vidi kvorum i zapisnik', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.vlasnik.email);
    await page.goto(adresa);
    await expect(page.getByText('Kvorum je utvrđen')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Zapisnik' }).getByRole('link')).toBeVisible();
  });
});

test.describe.serial('zbor stanara', () => {
  const razlog = 'Upravnik je sprečen, novi termin sledeće nedelje.';
  let adresa = '';

  test('upravnik zakaže zbor i otkaže ga sa razlogom', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.upravnik.email);
    adresa = await zakazi(page, `Zbor o dvorištu ${Date.now()}`, 'Zbor stanara');
    await page.getByRole('button', { name: 'Otkaži sastanak' }).click();
    await page.getByLabel('Razlog otkazivanja').fill(razlog);
    await page.getByRole('button', { name: 'Otkaži sastanak' }).click();
    await expect(page.getByRole('note')).toContainText(razlog);
  });

  test('ukućanin vidi da je zbor otkazan i zašto', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.ukucanin.email);
    await page.goto(adresa);
    await expect(page.getByRole('note')).toContainText('Sastanak je otkazan');
    await expect(page.getByRole('note')).toContainText(razlog);
  });
});
