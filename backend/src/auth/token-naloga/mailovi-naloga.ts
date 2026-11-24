import type { Mail } from '../../shared/mail/mail.service.js';
import {
  TRAJANJE_LINKA_MIN,
  TRAJANJE_POTVRDE_SATI,
} from '../auth.constants.js';

function telo(...pasusi: string[]) {
  return `<div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.5; color: #222">${pasusi.map((p) => `<p>${p}</p>`).join('')}</div>`;
}

function dugme(link: string, tekst: string) {
  return `<a href="${link}" style="display: inline-block; padding: 10px 18px; background: #F5B83D; color: #111; text-decoration: none; border-radius: 6px; font-weight: bold">${tekst}</a>`;
}

const LINK_LOZINKE = `Link važi ${TRAJANJE_LINKA_MIN} minuta i može da se iskoristi samo jednom.`;

export function mailPotvrda(za: string, link: string): Mail {
  const uvod =
    'Hvala na registraciji. Još samo da potvrdiš da je ova adresa tvoja.';
  const trajanje = `Link važi ${TRAJANJE_POTVRDE_SATI} sata. Ako istekne, zatraži novi na stranici za prijavu.`;
  const zanemari =
    'Ako se nisi registrovao, zanemari mejl. Nalog neće biti aktiviran.';

  return {
    za,
    naslov: 'Aktivacija naloga',
    tekst: `${uvod}\n\nNalog aktiviraj ovde:\n${link}\n\n${trajanje}\n\n${zanemari}`,
    html: telo(uvod, dugme(link, 'Aktiviraj nalog'), trajanje, zanemari),
  };
}

export function mailNalogPostoji(za: string, link: string): Mail {
  const uvod =
    'Neko je pokušao da napravi nov nalog sa ovom adresom, a nalog sa njom već postoji.';
  const savet =
    'Ako si to bio ti, prijavi se. Ako si zaboravio lozinku, postavi novu:';
  const zanemari =
    'Ako to nisi bio ti, zanemari mejl. Tvoj nalog i lozinka ostaju isti.';

  return {
    za,
    naslov: 'Nalog već postoji',
    tekst: `${uvod}\n\n${savet}\n${link}\n\n${LINK_LOZINKE}\n\n${zanemari}`,
    html: telo(
      uvod,
      savet,
      dugme(link, 'Postavi novu lozinku'),
      LINK_LOZINKE,
      zanemari,
    ),
  };
}

export function mailNovaLozinka(za: string, link: string): Mail {
  const uvod = 'Primili smo zahtev za promenu lozinke na tvom nalogu.';
  const zanemari =
    'Ako ovaj zahtev nije tvoj, zanemari mejl. Lozinka ostaje ista.';

  return {
    za,
    naslov: 'Promena lozinke',
    tekst: `${uvod}\n\nNovu lozinku postavi ovde:\n${link}\n\n${LINK_LOZINKE}\n\n${zanemari}`,
    html: telo(
      uvod,
      dugme(link, 'Postavi novu lozinku'),
      LINK_LOZINKE,
      zanemari,
    ),
  };
}

export function mailNalogObrisan(za: string): Mail {
  const uvod =
    'Tvoj nalog u aplikaciji za upravljanje zgradom je obrisan. Ime, email i telefon više nisu sačuvani, a lični oglasi su uklonjeni.';
  const istorija =
    'Prijave kvarova, komentari i glasovi ostaju u istoriji zgrade, ali bez tvog imena.';
  const upozorenje =
    'Ako nalog nisi obrisao ti, javi se upravniku zgrade ili administratoru.';

  return {
    za,
    naslov: 'Nalog je obrisan',
    tekst: `${uvod}

${istorija}

${upozorenje}`,
    html: telo(uvod, istorija, upozorenje),
  };
}

export function mailLozinkaPromenjena(za: string): Mail {
  const uvod = 'Lozinka na tvom nalogu je upravo promenjena.';
  const upozorenje =
    'Ako ovo nije tvoja promena, odmah zatraži novu lozinku preko stranice za prijavu i javi se upravniku zgrade.';

  return {
    za,
    naslov: 'Lozinka je promenjena',
    tekst: `${uvod}\n\n${upozorenje}`,
    html: telo(uvod, upozorenje),
  };
}
