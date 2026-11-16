import { expect, test } from '@playwright/test';
import { linkIzMejla, ucitajSvet } from './pomoc/svet';
import { prijavi } from './pomoc/prijava';

test('zaboravljena lozinka: link iz mejla, nova lozinka i prijava njom', async ({ page }) => {
  const { zaboravni } = await ucitajSvet();
  const nova = 'NovaLozinka123!';
  await page.goto('/login');
  await page.getByRole('link', { name: 'Zaboravljena lozinka?' }).click();
  await expect(page.getByRole('heading', { name: 'Zaboravljena lozinka' })).toBeVisible();
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

test('promena lozinke na profilu: uređaj ostaje prijavljen, a važi samo nova lozinka', async ({
  page,
}) => {
  const { promenaLozinke, lozinka } = await ucitajSvet();
  const nova = 'NovaLozinka123!';
  await prijavi(page, promenaLozinke.email);
  await page.goto('/profil');
  const odeljak = page.getByRole('region', { name: 'Lozinka' });
  await odeljak.getByRole('button', { name: 'Promeni lozinku' }).click();

  await odeljak.getByLabel('Trenutna lozinka', { exact: true }).fill('PogresnaLozinka1!');
  await odeljak.getByLabel('Nova lozinka', { exact: true }).fill(nova);
  await odeljak.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(odeljak.getByText('Trenutna lozinka nije ispravna.')).toBeVisible();

  await odeljak.getByLabel('Trenutna lozinka', { exact: true }).fill(lozinka);
  await odeljak.getByRole('button', { name: 'Sačuvaj' }).click();
  await expect(
    odeljak.getByText('Lozinka je promenjena. Odjavljen si sa ostalih uređaja.'),
  ).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/profil/);
  await expect(page.getByRole('region', { name: 'Lozinka' })).toBeVisible();

  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email').fill(promenaLozinke.email);
  await page.getByLabel('Lozinka', { exact: true }).fill(lozinka);
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page.getByText('Email ili lozinka nisu ispravni.')).toBeVisible();
  await page.getByLabel('Lozinka', { exact: true }).fill(nova);
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page).not.toHaveURL(/\/login/);
});
