import { expect, test } from '@playwright/test';
import { popuniPrijavu, prijavi } from './pomoc/prijava';
import { ucitajSvet } from './pomoc/svet';

test('gost sa zaštićene stranice ide na prijavu i posle prijave se vraća', async ({ page }) => {
  const { a } = await ucitajSvet();
  await page.goto('/oglasi');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Foglasi/);
  await popuniPrijavu(page, a.vlasnik.email);
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

test('stanar bez stana na kvarovima dobija tekst za sebe, ne za upravnika', async ({ page }) => {
  const { bezStana } = await ucitajSvet();
  await prijavi(page, bezStana.email);
  await page.goto('/kvarovi');
  await expect(
    page.getByText('Kad povežeš nalog sa stanom, ovde ćeš videti kvarove svog stana i zgrade.'),
  ).toBeVisible();
  await expect(page.getByText('Prijave stanara pojaviće se ovde.')).toHaveCount(0);
});
