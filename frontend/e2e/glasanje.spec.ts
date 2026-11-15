import { expect, test } from '@playwright/test';
import { prijavi } from './pomoc/prijava';
import { ucitajSvet } from './pomoc/svet';

test.describe.serial('anketa', () => {
  let pitanje = '';
  test.beforeAll(() => {
    pitanje = `Koju boju biramo za ulaz ${Date.now()}?`;
  });

  test('upravnik pokrene anketu', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.upravnik.email);
    await page.getByRole('navigation').getByRole('link', { name: 'Glasanje' }).click();
    await page.getByRole('link', { name: 'Novo glasanje' }).click();
    await page.getByLabel('Pitanje').fill(pitanje);
    await page.getByLabel('Opcija 1', { exact: true }).fill('Siva');
    await page.getByLabel('Opcija 2', { exact: true }).fill('Zelena');
    await page.getByRole('button', { name: 'Pokreni anketu' }).click();
    await expect(page).toHaveURL(/\/glasanje/);
    await expect(page.getByRole('heading', { name: pitanje })).toBeVisible();
  });

  test('stanar glasa i može da promeni glas', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.sused.email);
    await page.goto('/glasanje');
    const anketa = page.getByRole('article', { name: pitanje });
    const zelena = anketa.getByRole('button', { name: /Zelena/ });
    const siva = anketa.getByRole('button', { name: /Siva/ });
    await zelena.click();
    await expect(zelena).toHaveAttribute('aria-pressed', 'true');
    await siva.click();
    await expect(siva).toHaveAttribute('aria-pressed', 'true');
    await expect(zelena).toHaveAttribute('aria-pressed', 'false');
  });

  test('stanar druge zgrade ne vidi anketu', async ({ page }) => {
    const { b } = await ucitajSvet();
    await prijavi(page, b.vlasnik.email);
    await page.goto('/glasanje');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: pitanje })).toHaveCount(0);
  });
});
