import { expect, test } from '@playwright/test';
import { prijavi } from './pomoc/prijava';
import { ucitajSvet } from './pomoc/svet';

test.describe.serial('kvar od prijave do zatvaranja', () => {
  let adresaKvara = '';
  let naslov = '';
  test.beforeAll(() => {
    naslov = `Curi slavina u kupatilu ${Date.now()}`;
  });

  test('stanar prijavi kvar u stanu', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.vlasnik.email);
    await page.getByRole('navigation').getByRole('link', { name: 'Kvarovi' }).click();
    await page.getByRole('link', { name: 'Prijavi kvar' }).click();
    await page.getByText('U stanu', { exact: true }).click();
    await page.getByText('Vodovod', { exact: true }).click();
    await expect(page.getByRole('radio', { name: 'Vodovod' })).toBeChecked();
    await page.getByLabel('Naslov').fill(naslov);
    await page.getByLabel('Opis').fill('Kaplje i noću, voda se skuplja ispod lavaboa.');
    await page.getByRole('button', { name: 'Prijavi kvar' }).click();

    await expect(page).toHaveURL(/\/kvarovi\/\d+$/);
    await expect(page.getByRole('heading', { name: naslov })).toBeVisible();
    await expect(page.getByText('Prijavljen').first()).toBeVisible();
    adresaKvara = new URL(page.url()).pathname;
  });

  test('stanar druge zgrade ne vidi taj kvar', async ({ page }) => {
    const { b } = await ucitajSvet();
    await prijavi(page, b.vlasnik.email);
    await page.goto(adresaKvara);
    await expect(page.getByRole('heading', { name: naslov })).toHaveCount(0);
    await expect(page.getByText('Kvar ne postoji ili nemaš pristup njemu.')).toBeVisible();
  });

  test('upravnik prihvati kvar i dodeli ga serviseru', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.upravnik.email);
    await page.goto(adresaKvara);
    await page.getByRole('button', { name: 'Prihvati' }).click();
    await page.getByRole('combobox', { name: /servis/i }).click();
    await page.getByRole('option', { name: /Serviser/ }).click();
    await page.getByRole('button', { name: 'Dodeli' }).click();
    await expect(page.getByText('Dodeljen').first()).toBeVisible();
  });

  test('serviser počne rad i označi kvar kao rešen', async ({ page }) => {
    const { serviser } = await ucitajSvet();
    await prijavi(page, serviser.email);
    await page.getByRole('link', { name: naslov }).click();
    await page.getByRole('button', { name: 'Počni rad' }).click();
    await expect(page.getByText('U toku').first()).toBeVisible();
    await page.getByRole('button', { name: 'Označi kao rešen' }).click();
    await expect(page.getByText('Rešen').first()).toBeVisible();
  });

  test('stanar potvrdi da je rešeno i kvar se zatvara', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.vlasnik.email);
    await page.goto(adresaKvara);
    await page.getByRole('button', { name: 'Potvrdi da je rešeno' }).click();
    await expect(page.getByText('Zatvoren').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Potvrdi da je rešeno' })).toHaveCount(0);
  });
});
