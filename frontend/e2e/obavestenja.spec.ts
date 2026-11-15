import { expect, test } from '@playwright/test';
import { prijavi } from './pomoc/prijava';
import { ucitajSvet } from './pomoc/svet';

test('stanar dobije obaveštenje o novoj anketi bez osvežavanja stranice', async ({
  page,
  browser,
}) => {
  const { a } = await ucitajSvet();
  const povezan = page.waitForResponse((odgovor) =>
    odgovor.url().endsWith('/notifikacija/broj-neprocitanih'),
  );
  await prijavi(page, a.ukucanin.email);
  const { broj: pre } = (await (await povezan).json()) as { broj: number };
  const zvonce = page.getByRole('link', { name: /^Obaveštenja/ });

  const upravnik = await browser.newContext();
  try {
    const strana = await upravnik.newPage();
    await prijavi(strana, a.upravnik.email);
    await strana.goto('/glasanje/nova');
    await strana.getByLabel('Pitanje').fill(`Gde stavljamo klupu ${Date.now()}?`);
    await strana.getByLabel('Opcija 1', { exact: true }).fill('Ispred ulaza');
    await strana.getByLabel('Opcija 2', { exact: true }).fill('U dvorištu');
    await strana.getByRole('button', { name: 'Pokreni anketu' }).click();
    await expect(strana).toHaveURL(/\/glasanje$/);
  } finally {
    await upravnik.close();
  }

  await expect(zvonce).toHaveAttribute('aria-label', new RegExp(`^Obaveštenja, ${pre + 1} `));
});
