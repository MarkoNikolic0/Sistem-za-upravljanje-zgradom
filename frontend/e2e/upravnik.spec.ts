import { expect, test } from '@playwright/test';
import { prijavi } from './pomoc/prijava';
import { ucitajSvet } from './pomoc/svet';

test('upravnik jedne zgrade na početnoj ima Za tebe danas', async ({ page }) => {
  const { a } = await ucitajSvet();
  await prijavi(page, a.upravnik.email);
  await expect(page.getByRole('heading', { name: 'Za tebe danas' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tvoje zgrade' })).toHaveCount(0);
});

test('upravnik dve zgrade bira zgradu na početnoj i kod stanara', async ({ page }) => {
  const { dveZgrade } = await ucitajSvet();
  await prijavi(page, dveZgrade.upravnik.email);
  const zeta = page.getByRole('link', { name: /Zeta/ });
  await expect(page.getByRole('link', { name: /Epsilon/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Za tebe danas' })).toHaveCount(0);

  await zeta.click();
  await expect(page).toHaveURL(new RegExp(`zgrada=${dveZgrade.zgrade[1]}`));
  await expect(page.getByRole('heading', { name: 'Za tebe danas' })).toBeVisible();
  await expect(page.getByText(/^Zeta/)).toBeVisible();
  await page.getByRole('link', { name: 'Sve zgrade' }).click();
  await expect(zeta).toBeVisible();

  await page.goto('/stanari');
  await expect(page.getByRole('heading', { name: 'Stanari' })).toBeVisible();
  await expect(page.getByText('VlasnikEpsilon Probić')).toBeVisible();
  await page.getByRole('combobox', { name: 'Zgrada' }).click();
  await page.getByRole('option', { name: /Zeta/ }).click();
  await expect(page.getByText('VlasnikZeta Probić')).toBeVisible();
  await expect(page.getByText('VlasnikEpsilon Probić')).toHaveCount(0);
});
