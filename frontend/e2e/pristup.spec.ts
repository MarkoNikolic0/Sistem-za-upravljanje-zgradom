import { expect, test } from '@playwright/test';
import { prijavi } from './pomoc/prijava';
import { ucitajSvet } from './pomoc/svet';

test('gost sa zaštićene stranice ide na prijavu i posle prijave se vraća', async ({ page }) => {
  const { a } = await ucitajSvet();
  await page.goto('/oglasi');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Foglasi/);
  await page.getByLabel('Email').fill(a.vlasnik.email);
  await page.getByLabel('Lozinka', { exact: true }).fill((await ucitajSvet()).lozinka);
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page).toHaveURL(/\/oglasi$/);
});

test('stanar ne može na stranice upravnika i admina', async ({ page }) => {
  const { a } = await ucitajSvet();
  await prijavi(page, a.vlasnik.email);
  for (const adresa of ['/zgrade', '/zahtevi', '/stanari']) {
    await page.goto(adresa);
    await expect(page).toHaveURL(/\/$/);
  }
});

test('prijavljen korisnik sa prijave ide na početnu, serviser na kvarove', async ({ page }) => {
  const { serviser } = await ucitajSvet();
  await prijavi(page, serviser.email);
  await expect(page).toHaveURL(/\/kvarovi$/);
  await page.goto('/login');
  await expect(page).toHaveURL(/\/kvarovi$/);
});
