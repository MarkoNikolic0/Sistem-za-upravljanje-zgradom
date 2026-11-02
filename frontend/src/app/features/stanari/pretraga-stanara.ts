import { StanSaStanarima } from './stanari-models';

function bezKvacica(tekst: string): string {
  return tekst
    .toLocaleLowerCase('sr-Latn')
    .replaceAll('đ', 'dj')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function pretraziStanove(stanovi: StanSaStanarima[], upit: string): StanSaStanarima[] {
  const trazi = bezKvacica(upit.trim());
  if (trazi === '') {
    return stanovi;
  }
  return stanovi.filter(
    (stan) =>
      bezKvacica(stan.broj) === trazi ||
      stan.stanari.some(({ korisnik: k }) =>
        [`${k.ime} ${k.prezime}`, `${k.prezime} ${k.ime}`].some((ime) =>
          bezKvacica(ime).includes(trazi),
        ),
      ),
  );
}
