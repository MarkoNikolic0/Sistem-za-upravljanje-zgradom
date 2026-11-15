import { expect, Page, test } from '@playwright/test';
import { prijavi } from './pomoc/prijava';
import { pomeriUProslost, ucitajSvet } from './pomoc/svet';

test.describe.serial('odluka', () => {
  let pitanje = '';
  let id = 0;
  test.beforeAll(() => {
    pitanje = `Da li menjamo lift ${Date.now()}?`;
  });

  const odluka = (page: Page) => page.getByRole('article', { name: pitanje });

  test('upravnik pokrene glasanje o odluci', async ({ page }) => {
    const { a } = await ucitajSvet();
    await prijavi(page, a.upravnik.email);
    await page.goto('/glasanje');
    await page.getByRole('link', { name: 'Novo glasanje' }).click();
    await page.getByText('Odluka', { exact: true }).click();
    await page.getByLabel('Pitanje').fill(pitanje);
    await page.getByText('Obična većina', { exact: true }).click();
    await page.getByRole('button', { name: 'Pokreni glasanje o odluci' }).click();
    const naslov = page.getByRole('heading', { name: pitanje });
    await expect(naslov).toBeVisible();
    id = Number((await naslov.getAttribute('id'))?.replace('pitanje-', ''));
    expect(id).toBeGreaterThan(0);
  });

  test('vlasnici glasaju Za, a ukućanin ne vidi odluku', async ({ page }) => {
    const { a } = await ucitajSvet();
    for (const vlasnik of [a.vlasnik, a.sused]) {
      await page.context().clearCookies();
      await prijavi(page, vlasnik.email);
      await page.goto('/glasanje');
      const za = odluka(page).getByRole('button', { name: /^Za/ });
      await za.click();
      await expect(za).toHaveAttribute('aria-pressed', 'true');
    }
    await page.context().clearCookies();
    await prijavi(page, a.ukucanin.email);
    await page.goto('/glasanje');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(odluka(page)).toHaveCount(0);
  });

  test('posle roka odluka je usvojena i upravnik je objavi na tabli', async ({ page }) => {
    const { a } = await ucitajSvet();
    await pomeriUProslost('glasanje', id);
    await prijavi(page, a.upravnik.email);
    await page.goto('/glasanje');
    await page.getByText('Završene', { exact: true }).click();
    await expect(odluka(page)).toContainText('Usvojena');
    await odluka(page).getByRole('link', { name: 'Objavi na tabli' }).click();
    await expect(page).toHaveURL(/\/oglasi\/novi\?odluka=\d+/);
    await expect(page.getByRole('heading', { name: 'Objava odluke' })).toBeVisible();
    await page.getByRole('button', { name: 'Objavi odluku' }).click();
    await expect(page).toHaveURL(/\/oglasi$/);
    await expect(page.getByRole('article').filter({ hasText: pitanje })).toBeVisible();
  });
});
