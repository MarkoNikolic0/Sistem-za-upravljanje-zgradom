import { expect, test } from '@playwright/test';
import { popuniPrijavu, prijavi } from './pomoc/prijava';
import { linkIzMejla, ucitajSvet } from './pomoc/svet';

test.describe.serial('admin upravlja korisnicima', () => {
  const email = `nikola.peric.${Date.now()}@test.local`;
  const ime = 'Nikola Perić';

  const radnje = async (page: import('@playwright/test').Page, radnja: string) => {
    await page.goto('/stanari');
    await page.getByLabel('Pretraga').fill(email);
    await page.getByRole('button', { name: `Radnje: ${ime}` }).click();
    await page.getByRole('menuitem', { name: radnja }).click();
  };

  test('nov korisnik napravi i aktivira nalog', async ({ page }) => {
    const { lozinka } = await ucitajSvet();
    await page.goto('/register');
    await page.getByLabel('Ime', { exact: true }).fill('Nikola');
    await page.getByLabel('Prezime').fill('Perić');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Telefon').fill('0647654321');
    await page.getByLabel('Lozinka', { exact: true }).fill(lozinka);
    await page.getByRole('button', { name: 'Napravi nalog' }).click();
    const link = new URL(await linkIzMejla(email));
    await page.goto(`${link.pathname}${link.search}`);
    await page.getByRole('button', { name: 'Aktiviraj' }).click();
    await expect(page.getByRole('heading', { name: 'Nalog je aktiviran' })).toBeVisible();
  });

  test('admin ga postavi za servisera', async ({ page }) => {
    const { admin } = await ucitajSvet();
    await prijavi(page, admin.email);
    await radnje(page, 'Promeni ulogu');
    const dijalog = page.getByRole('dialog', { name: `Uloga: ${ime}` });
    await dijalog.getByText('Serviser', { exact: true }).click();
    await dijalog.getByRole('button', { name: 'Sačuvaj' }).click();
    await expect(page.getByText(`Uloga je promenjena: ${ime} je sada serviser.`)).toBeVisible();
  });

  test('deaktiviran korisnik ne može da se prijavi, a posle aktivacije može', async ({ page }) => {
    const { admin } = await ucitajSvet();
    await prijavi(page, admin.email);
    await radnje(page, 'Deaktiviraj');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Deaktiviraj' }).click();
    await expect(page.getByText(`Nalog je deaktiviran: ${ime}.`)).toBeVisible();

    await page.context().clearCookies();
    await page.goto('/login');
    await popuniPrijavu(page, email);
    await expect(page).toHaveURL(/\/login/);

    await prijavi(page, admin.email);
    await page.goto('/stanari');
    await page.getByText('Deaktivirani', { exact: true }).click();
    await page.getByLabel('Pretraga').fill(email);
    await page.getByRole('button', { name: `Radnje: ${ime}` }).click();
    await page.getByRole('menuitem', { name: 'Aktiviraj' }).click();
    await expect(page.getByText(`Nalog je ponovo aktivan: ${ime}.`)).toBeVisible();

    await page.context().clearCookies();
    await prijavi(page, email);
  });

  test('stanar ne vidi upravljanje korisnicima', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.vlasnik.email);
    await page.goto('/stanari');
    await expect(page.getByRole('button', { name: `Radnje: ${ime}` })).toHaveCount(0);
  });
});

test.describe.serial('admin upravlja zgradama', () => {
  let naziv = '';
  test.beforeAll(() => {
    naziv = `Zgrada Omega ${Date.now()}`;
  });

  test('admin doda zgradu i stan, pa je arhivira i vrati', async ({ page }) => {
    const { admin } = await ucitajSvet();
    await prijavi(page, admin.email);
    await page.goto('/zgrade');
    await page.locator('#nova-zgrada').click();
    await page.getByLabel('Naziv').fill(naziv);
    await page.getByLabel('Adresa').fill('Bulevar Nemanjića 1, Niš');
    await page.getByRole('button', { name: 'Dodaj zgradu' }).click();
    await expect(page.getByRole('heading', { level: 1, name: naziv })).toBeVisible();

    await page.locator('#dodaj-stan').click();
    await page.getByLabel('Broj stana').fill('1');
    await page.getByLabel('Sprat').fill('0');
    await page.getByLabel('Kvadratura').fill('54');
    await page.locator('app-forma-stana').getByRole('button', { name: 'Dodaj stan' }).click();
    await expect(page.getByRole('button', { name: 'Izmeni stan 1' })).toBeVisible();

    await page.getByRole('button', { name: 'Arhiviraj' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: /Arhiviraj/ })
      .click();
    await page.goto('/zgrade');
    await page.getByRole('button', { name: `Vrati zgradu ${naziv}` }).click();
    await expect(page.getByRole('link', { name: new RegExp(naziv) })).toBeVisible();
  });
});
