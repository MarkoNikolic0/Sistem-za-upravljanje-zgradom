import { expect, Page, test } from '@playwright/test';
import { popuniPrijavu, prijavi } from './pomoc/prijava';
import { linkIzMejla, ucitajSvet } from './pomoc/svet';

async function napraviNalog(page: Page, ime: string, prezime: string, email: string) {
  const { lozinka } = await ucitajSvet();
  await page.goto('/register');
  await page.getByLabel('Ime', { exact: true }).fill(ime);
  await page.getByLabel('Prezime').fill(prezime);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Telefon').fill('0647654321');
  await page.getByLabel('Lozinka', { exact: true }).fill(lozinka);
  await page.getByRole('button', { name: 'Napravi nalog' }).click();
  const link = new URL(await linkIzMejla(email));
  await page.goto(`${link.pathname}${link.search}`);
  await page.getByRole('button', { name: 'Aktiviraj' }).click();
  await expect(page.getByRole('heading', { name: 'Nalog je aktiviran' })).toBeVisible();
}

test('korisnik obriše svoj nalog uz lozinku i više ne može da se prijavi', async ({ page }) => {
  const { lozinka } = await ucitajSvet();
  const email = `milena.ristic.${Date.now()}@test.local`;
  await napraviNalog(page, 'Milena', 'Ristić', email);
  await prijavi(page, email);

  await page.goto('/profil');
  await page.getByRole('button', { name: 'Obriši nalog' }).click();
  const lozinkaPolje = page.getByLabel('Potvrdi lozinkom');
  await expect(lozinkaPolje).toBeFocused();
  await expect(page.getByText('Brisanje ne može da se poništi.')).toBeVisible();

  await page.getByRole('button', { name: 'Trajno obriši nalog' }).click();
  await expect(page.getByText('Unesi lozinku.')).toBeVisible();

  await lozinkaPolje.fill('PogresnaLozinka1!');
  await page.getByRole('button', { name: 'Trajno obriši nalog' }).click();
  await expect(page.getByText('Lozinka nije ispravna.')).toBeVisible();
  await expect(lozinkaPolje).toBeFocused();

  await lozinkaPolje.fill(lozinka);
  await page.getByRole('button', { name: 'Trajno obriši nalog' }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByText('Nalog je obrisan. Potvrdu smo poslali na tvoj email.'),
  ).toBeVisible();

  await popuniPrijavu(page, email);
  await expect(page.getByText('Email ili lozinka nisu ispravni.')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('administrator na profilu nema brisanje naloga', async ({ page }) => {
  const { admin } = await ucitajSvet();
  await prijavi(page, admin.email);
  await page.goto('/profil');
  await expect(page.getByRole('heading', { name: 'Lozinka' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Brisanje naloga' })).toHaveCount(0);
});

test('admin obriše deaktiviran nalog i on nestaje sa spiska', async ({ page }) => {
  const { admin } = await ucitajSvet();
  const email = `vuk.lazarevic.${Date.now()}@test.local`;
  const ime = 'Vuk Lazarević';
  await napraviNalog(page, 'Vuk', 'Lazarević', email);

  await prijavi(page, admin.email);
  await page.goto('/stanari');
  await page.getByLabel('Pretraga').fill(email);
  await page.getByRole('button', { name: `Radnje: ${ime}` }).click();
  await page.getByRole('menuitem', { name: 'Deaktiviraj' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Deaktiviraj' }).click();
  await expect(page.getByText(`Nalog je deaktiviran: ${ime}.`)).toBeVisible();

  await page.getByText('Deaktivirani', { exact: true }).click();
  await page.getByLabel('Pretraga').fill(email);
  await page.getByRole('button', { name: `Radnje: ${ime}` }).click();
  await page.getByRole('menuitem', { name: 'Obriši nalog' }).click();
  const dijalog = page.getByRole('alertdialog', { name: 'Brisanje naloga' });
  await expect(dijalog).toContainText('Brisanje ne može da se poništi.');
  await dijalog.getByRole('button', { name: 'Obriši nalog' }).click();
  await expect(page.getByText(`Nalog je obrisan: ${ime}.`)).toBeVisible();
  await expect(page.getByRole('button', { name: `Radnje: ${ime}` })).toHaveCount(0);
});
