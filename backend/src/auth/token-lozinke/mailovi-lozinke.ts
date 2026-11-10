import type { Mail } from '../../shared/mail/mail.service.js';
import { TRAJANJE_LINKA_MIN } from '../auth.constants.js';

function telo(...pasusi: string[]) {
  return `<div style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.5; color: #222">${pasusi.map((p) => `<p>${p}</p>`).join('')}</div>`;
}

export function mailNovaLozinka(za: string, link: string): Mail {
  const uvod = 'Primili smo zahtev za promenu lozinke na tvom nalogu.';
  const trajanje = `Link važi ${TRAJANJE_LINKA_MIN} minuta i može da se iskoristi samo jednom.`;
  const zanemari =
    'Ako ovaj zahtev nije tvoj, zanemari mejl. Lozinka ostaje ista.';

  return {
    za,
    naslov: 'Promena lozinke',
    tekst: `${uvod}\n\nNovu lozinku postavi ovde:\n${link}\n\n${trajanje}\n\n${zanemari}`,
    html: telo(
      uvod,
      `<a href="${link}" style="display: inline-block; padding: 10px 18px; background: #F5B83D; color: #111; text-decoration: none; border-radius: 6px; font-weight: bold">Postavi novu lozinku</a>`,
      trajanje,
      zanemari,
    ),
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
