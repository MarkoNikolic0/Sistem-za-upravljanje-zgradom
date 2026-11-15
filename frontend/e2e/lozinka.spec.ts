import { expect, test } from '@playwright/test';
import { linkIzMejla, ucitajSvet } from './pomoc/svet';

test('zaboravljena lozinka: link iz mejla, nova lozinka i prijava njom', async ({ page }) => {
  const { zaboravni } = await ucitajSvet();
  const nova = 'NovaLozinka123!';
  await page.goto('/login');
  await page.getByRole('link', { name: 'Zaboravljena lozinka?' }).click();
  await page.getByLabel('Email').fill(zaboravni.email);
  await page.getByRole('button', { name: 'Pošalji link' }).click();
  await expect(page.getByRole('heading', { name: 'Proveri mejl' })).toBeVisible();

  const link = new URL(await linkIzMejla(zaboravni.email));
  await page.goto(`${link.pathname}${link.search}`);
  await page.getByLabel('Nova lozinka', { exact: true }).fill(nova);
  await page.getByLabel('Ponovi novu lozinku').fill(nova);
  await page.getByRole('button', { name: 'Sačuvaj lozinku' }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText('Lozinka je promenjena. Prijavi se novom lozinkom.')).toBeVisible();
  await page.getByLabel('Email').fill(zaboravni.email);
  await page.getByLabel('Lozinka', { exact: true }).fill(nova);
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page).not.toHaveURL(/\/login/);
});
