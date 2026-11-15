import { expect, test } from '@playwright/test';
import { prijavi } from './pomoc/prijava';
import { linkIzMejla, ucitajSvet } from './pomoc/svet';

test.describe.serial('nov stanar', () => {
  const email = `jovana.ilic.${Date.now()}@test.local`;

  test('napravi nalog, aktivira ga iz mejla, prijavi se i zatraži stan', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Ime', { exact: true }).fill('Jovana');
    await page.getByLabel('Prezime').fill('Ilić');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Telefon').fill('0641234567');
    await page.getByLabel('Lozinka', { exact: true }).fill('Zgrada123!');
    await page.getByRole('button', { name: 'Napravi nalog' }).click();
    await expect(page.getByRole('heading', { name: 'Proveri mejl' })).toBeVisible();

    const link = new URL(await linkIzMejla(email));
    await page.goto(`${link.pathname}${link.search}`);
    await page.getByRole('button', { name: 'Aktiviraj' }).click();
    await expect(page.getByRole('heading', { name: 'Nalog je aktiviran' })).toBeVisible();

    await prijavi(page, email);
    await page.getByRole('link', { name: 'Poveži se sa stanom' }).click();
    await page.getByRole('combobox', { name: 'Zgrada' }).click();
    await page.getByRole('option', { name: /Alfa/ }).click();
    await page.getByRole('combobox', { name: 'Stan' }).click();
    await page.getByRole('option', { name: /3/ }).click();
    await page.getByRole('button', { name: 'Pošalji zahtev' }).click();
    await expect(page.getByText('Zahtev je poslat upravniku zgrade.')).toBeVisible();
  });

  test('upravnik prihvati zahtev, pa stanar može da prijavi kvar', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.upravnik.email);
    await page.goto('/zahtevi');
    const zahtev = page.getByRole('article').filter({ hasText: email });
    await zahtev.getByRole('button', { name: 'Prihvati kao stanara' }).click();
    await expect(page.getByText(email)).toHaveCount(0);

    await page.context().clearCookies();
    await prijavi(page, email);
    await page.goto('/kvarovi/novi');
    await expect(page.getByRole('heading', { name: 'Prijava kvara' })).toBeVisible();
    await expect(page.getByRole('region', { name: /Gde je kvar/ })).toContainText('Stan 3');
  });
});

test('pogrešna lozinka ne prijavljuje', async ({ page }) => {
  const { a } = await ucitajSvet();
  await page.goto('/login');
  await page.getByLabel('Email').fill(a.vlasnik.email);
  await page.getByLabel('Lozinka', { exact: true }).fill('pogresna-lozinka');
  await page.getByRole('button', { name: 'Prijavi se' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
