import { expect, Page, test } from '@playwright/test';
import { prijavi } from './pomoc/prijava';
import { ucitajSvet } from './pomoc/svet';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

function dugeAnimacije(page: Page) {
  return page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((animacija) => Number(animacija.effect?.getComputedTiming().duration) > 1).length,
  );
}

test('uz smanjeno kretanje nema animacija, a navigacija i meni rade', async ({ page }) => {
  const { a } = await ucitajSvet();
  await prijavi(page, a.vlasnik.email);

  await page.getByRole('navigation').getByRole('link', { name: 'Kvarovi' }).click();
  await expect(page.getByRole('heading', { name: 'Kvarovi', level: 1 })).toBeVisible();
  expect(await dugeAnimacije(page)).toBe(0);

  await page.getByRole('button', { name: 'Meni naloga' }).click();
  const profil = page.getByRole('menuitem', { name: 'Moj profil' });
  await expect(profil).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(profil).toBeHidden();

  await page.getByRole('navigation').getByRole('link', { name: 'Glasanje' }).click();
  await expect(page.getByRole('heading', { name: 'Glasanje', level: 1 })).toBeVisible();
  expect(await dugeAnimacije(page)).toBe(0);
});
