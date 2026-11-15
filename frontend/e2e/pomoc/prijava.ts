import { expect, Page } from '@playwright/test';
import { ucitajSvet } from './svet';

export async function popuniPrijavu(page: Page, email: string) {
  const { lozinka } = await ucitajSvet();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Lozinka', { exact: true }).fill(lozinka);
  await page.getByRole('button', { name: 'Prijavi se' }).click();
}

export async function prijavi(page: Page, email: string) {
  await page.goto('/login');
  await popuniPrijavu(page, email);
  await expect(page).not.toHaveURL(/\/login/);
}
