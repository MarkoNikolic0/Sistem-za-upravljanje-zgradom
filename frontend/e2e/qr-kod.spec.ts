import { expect, Page, test } from '@playwright/test';
import { popuniPrijavu, prijavi } from './pomoc/prijava';
import { linkIzMejla, ucitajSvet } from './pomoc/svet';

const izabranaZgrada = (page: Page) => page.getByRole('combobox', { name: 'Zgrada' });

test('nov stanar sa QR koda: registracija, mejl na drugom uređaju, prijava i zahtev za stan u toj zgradi', async ({
  page,
  browser,
}) => {
  const { b, lozinka } = await ucitajSvet();
  const email = `milica.peric.${Date.now()}@test.local`;

  await page.goto(`/poziv/${b.id}`);
  await expect(page).toHaveURL(`/register?zgrada=${b.id}`);
  await page.getByLabel('Ime', { exact: true }).fill('Milica');
  await page.getByLabel('Prezime').fill('Perić');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Telefon').fill('0641234567');
  await page.getByLabel('Lozinka', { exact: true }).fill(lozinka);
  await page.getByRole('button', { name: 'Napravi nalog' }).click();
  await expect(page.getByRole('heading', { name: 'Proveri mejl' })).toBeVisible();

  const link = new URL(await linkIzMejla(email));
  expect(link.searchParams.get('zgrada')).toBe(String(b.id));

  const racunar = await browser.newContext();
  try {
    const drugi = await racunar.newPage();
    await drugi.goto(link.href);
    await drugi.getByRole('button', { name: 'Aktiviraj nalog' }).click();
    await drugi.getByRole('link', { name: 'Prijavi se' }).click();
    await expect(drugi.getByRole('heading', { name: 'Prijavi se' })).toBeVisible();
    await popuniPrijavu(drugi, email);

    await expect(drugi).toHaveURL(new RegExp(`/povezivanje\\?zgrada=${b.id}$`));
    await expect(izabranaZgrada(drugi)).toContainText('Beta');
    await drugi.getByRole('combobox', { name: 'Stan' }).click();
    await drugi.getByRole('option', { name: /^Stan 2 ·/ }).click();
    await drugi.getByRole('button', { name: 'Pošalji zahtev' }).click();
    await expect(drugi.getByText('Zahtev je poslat upravniku zgrade.')).toBeVisible();
    await expect(drugi.getByRole('region', { name: 'Moji zahtevi' })).toContainText('Na čekanju');
  } finally {
    await racunar.close();
  }

  await prijavi(page, b.upravnik.email);
  await page.goto('/zahtevi');
  await expect(page.getByRole('article').filter({ hasText: email })).toBeVisible();
});

test('postojeći nalog sa QR koda: prijava sa registracije vodi na povezivanje sa tom zgradom', async ({
  page,
}) => {
  const { b, bezStana } = await ucitajSvet();
  await page.goto(`/poziv/${b.id}`);
  await page.getByRole('link', { name: 'Prijavi se' }).click();
  await expect(page.getByRole('heading', { name: 'Prijavi se' })).toBeVisible();
  await popuniPrijavu(page, bezStana.email);
  await expect(page).toHaveURL(new RegExp(`/povezivanje\\?zgrada=${b.id}$`));
  await expect(izabranaZgrada(page)).toContainText('Beta');
});

test('prijavljen stanar sa QR koda ide pravo na povezivanje sa tom zgradom', async ({ page }) => {
  const { a, b } = await ucitajSvet();
  await prijavi(page, a.vlasnik.email);
  await page.goto(`/poziv/${b.id}`);
  await expect(page).toHaveURL(`/povezivanje?zgrada=${b.id}`);
  await expect(izabranaZgrada(page)).toContainText('Beta');
});

test('arhivirana ili nepostojeća zgrada u linku ne otkriva ništa', async ({ page }) => {
  const { bezStana, arhiviranaZgrada } = await ucitajSvet();
  await prijavi(page, bezStana.email);
  for (const zgrada of [arhiviranaZgrada, 2147483647]) {
    await page.goto(`/poziv/${zgrada}`);
    await expect(page.getByText('Zgrada iz linka nije pronađena.')).toBeVisible();
    await expect(izabranaZgrada(page)).toContainText('Izaberi zgradu');
    await expect(page.getByText('Arhiva')).toHaveCount(0);
  }
  await izabranaZgrada(page).click();
  await page.getByRole('option', { name: /Beta/ }).click();
  await expect(page.getByText('Zgrada iz linka nije pronađena.')).toHaveCount(0);

  await page.goto('/poziv/abc');
  await expect(page).toHaveURL('/povezivanje');
  await expect(page.getByText('Zgrada iz linka nije pronađena.')).toHaveCount(0);
});

test('upravnik dve zgrade štampa plakat sa QR kodom za izabranu zgradu', async ({ page }) => {
  const { dveZgrade } = await ucitajSvet();
  const [prva, druga] = dveZgrade.zgrade;
  await prijavi(page, dveZgrade.upravnik.email);
  await page.goto('/zahtevi');
  await page.getByRole('link', { name: 'QR kod za stanare' }).click();
  await expect(page.getByRole('heading', { name: 'QR kod za stanare' })).toBeVisible();

  const plakat = page.getByRole('article', { name: 'Plakat za štampu' });
  const kod = plakat.getByRole('img', { name: /QR kod/ });
  await expect(plakat).toContainText('Epsilon');
  await expect(kod).toHaveAccessibleName(new RegExp(`/poziv/${prva}$`));
  await expect(page.getByText('Zgrada iz linka nije pronađena.')).toHaveCount(0);

  await izabranaZgrada(page).click();
  await page.getByRole('option', { name: /Zeta/ }).click();
  await expect(plakat).toContainText('Zeta');
  await expect(kod).toHaveAccessibleName(new RegExp(`/poziv/${druga}$`));

  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('button', { name: 'Štampaj' })).toBeHidden();
  await expect(plakat).toBeVisible();
  const pdf = (await page.pdf({ preferCSSPageSize: true })).toString('latin1');
  expect(pdf.match(/\/Type\s*\/Page[^s]/g)).toHaveLength(1);
});

test('admin otvara plakat sa stranice zgrade, a stanar ne može na plakat', async ({ page }) => {
  const { a, admin, arhiviranaZgrada } = await ucitajSvet();
  await prijavi(page, admin.email);
  await page.goto(`/zgrade/${a.id}`);
  await page.getByRole('link', { name: 'QR kod za stanare' }).click();
  await expect(page.getByRole('article', { name: 'Plakat za štampu' })).toContainText('Alfa');
  await page.goto(`/plakat?zgrada=${arhiviranaZgrada}`);
  await expect(page.getByText('Zgrada iz linka nije pronađena.')).toBeVisible();
  await expect(page.getByRole('article', { name: 'Plakat za štampu' })).not.toContainText('Arhiva');

  await page.context().clearCookies();
  await prijavi(page, a.vlasnik.email);
  await page.goto('/plakat');
  await expect(page).toHaveURL('/');
});

test('poziv za instalaciju na početnoj se zatvara i ne vraća se', async ({ page }) => {
  const { a } = await ucitajSvet();
  const ponudi = () =>
    page.evaluate(() => {
      const dogadjaj = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: () => {
          (window as Window & { ponudjeno?: boolean }).ponudjeno = true;
          return Promise.resolve();
        },
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      });
      window.dispatchEvent(dogadjaj);
    });
  const poziv = page.getByRole('region', { name: 'Instaliraj aplikaciju' });

  await prijavi(page, a.ukucanin.email);
  await expect(page.getByRole('heading', { name: /^Zdravo/ })).toBeVisible();
  await expect(poziv).toHaveCount(0);
  await ponudi();
  await poziv.getByRole('button', { name: 'Instaliraj' }).click();
  expect(await page.evaluate(() => (window as Window & { ponudjeno?: boolean }).ponudjeno)).toBe(
    true,
  );
  await expect(poziv).toHaveCount(0);

  await page.reload();
  await ponudi();
  await expect(page.getByRole('link', { name: 'Kvarovi' }).first()).toBeVisible();
  await expect(poziv).toHaveCount(0);
});
