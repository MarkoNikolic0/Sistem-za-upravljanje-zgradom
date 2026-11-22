import { PravilaFajlova, proveriIzbor } from './fajlovi';

const pravila: PravilaFajlova = {
  tipovi: ['image/png', 'application/pdf'],
  opisTipova: 'PNG ili PDF',
  maksMb: 1,
  maksBroj: 3,
  vlasnik: 'Oglas',
  mnozina: 'priloga',
};

const fajl = (ime: string, tip: string, bajtova = 10) =>
  new File([new Uint8Array(bajtova)], ime, { type: tip });

describe('proveriIzbor', () => {
  it('prihvata ispravne fajlove i javlja samo za odbijene', () => {
    const slika = fajl('slika.png', 'image/png');
    const { ispravni, greska } = proveriIzbor(
      [
        slika,
        fajl('beleska.txt', 'text/plain'),
        fajl('velik.pdf', 'application/pdf', 2 * 1024 * 1024),
      ],
      0,
      pravila,
    );
    expect(ispravni).toEqual([slika]);
    expect(greska).toBe(
      'Fajl „beleska.txt“ mora biti PNG ili PDF. Fajl „velik.pdf“ je veći od 1 MB.',
    );
  });

  it('bez greške kad su svi ispravni', () => {
    expect(proveriIzbor([fajl('a.png', 'image/png')], 0, pravila)).toEqual({
      ispravni: [expect.any(File)],
      greska: null,
    });
  });

  it('previše fajlova odbija ceo izbor i kaže koliko još može', () => {
    const { ispravni, greska } = proveriIzbor(
      [fajl('a.png', 'image/png'), fajl('b.png', 'image/png')],
      2,
      pravila,
    );
    expect(ispravni).toEqual([]);
    expect(greska).toBe('Oglas može imati najviše 3 priloga. Možeš da dodaš još 1.');
  });
});
