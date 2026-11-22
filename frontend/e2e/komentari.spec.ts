import { expect, test } from '@playwright/test';
import { prijavi } from './pomoc/prijava';
import { ucitajSvet } from './pomoc/svet';

const API = 'http://localhost:3100';

test('posle Prikaži starije komentare fokus je na najstarijem učitanom komentaru', async ({
  page,
  request,
}) => {
  const { a, lozinka } = await ucitajSvet();
  const prijava = await request.post(`${API}/auth/login`, {
    data: { email: a.vlasnik.email, lozinka },
  });
  const { accessToken } = (await prijava.json()) as { accessToken: string };
  const headers = { Authorization: `Bearer ${accessToken}` };
  const naslov = `Slab mlaz u tušu ${Date.now()}`;
  const kvar = await request.post(`${API}/kvar`, {
    headers,
    data: {
      naslov,
      opis: 'Mlaz je slab od jutros.',
      kategorija: 'vodovod',
      lokacijaTip: 'privatni_stan',
      stanId: a.stanovi[0],
    },
  });
  const { id } = (await kvar.json()) as { id: number };
  for (let i = 1; i <= 22; i++) {
    await request.post(`${API}/kvar/${id}/komentar`, { headers, data: { tekst: `Javljam ${i}` } });
  }

  await prijavi(page, a.upravnik.email);
  await page.goto(`/kvarovi/${id}`);
  const starije = page.getByRole('button', { name: /Prikaži starije komentare/ });
  await starije.focus();
  await page.keyboard.press('Enter');
  await expect(starije).toHaveCount(0);
  await expect(page.getByRole('article', { name: /Komentar/ }).first()).toBeFocused();
  await expect(page.getByRole('article', { name: /Komentar/ }).first()).toContainText('Javljam 1');
});
