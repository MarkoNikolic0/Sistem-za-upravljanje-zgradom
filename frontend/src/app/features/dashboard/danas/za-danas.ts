import { Glasanje } from '../../glasanje/glasanje-models';
import { Oglas } from '../../oglasi/oglas-models';
import { Sastanak, VRSTE_SASTANKA } from '../../sastanci/sastanak-models';
import { PregledZgrade } from '../../zgrade/zgrada-models';
import { danaDo } from '../../../shared/datum';
import { uMnozini } from '../../../shared/mnozina';

// Jedna stvar koja čeka korisnika danas, od najvažnije ka manje važnoj
export interface StavkaDanas {
  kljuc: string;
  ikonica: string;
  oznaka: string;
  naslov: string;
  opis: string;
  putanja: (string | number)[];
  hitno: boolean;
}

export interface PodaciDanas {
  pregled: PregledZgrade | null;
  sastanci: Sastanak[];
  glasanja: Glasanje[];
  oglasi: Oglas[];
}

// Sastanak se ističe kad je za najviše 7 dana, obaveštenje dok je novije od 3 dana
const DANA_DO_SASTANKA = 7;
const DANA_OBAVESTENJA = 3;

export function cekaMojGlas(g: Glasanje): boolean {
  return g.smeDaGlasa && g.mojGlas === null && g.glasaliSuvlasnici.length === 0;
}

export function predstoji(s: Pick<Sastanak, 'pocetak'>, sada = new Date()): boolean {
  return new Date(s.pocetak).getTime() > sada.getTime();
}

function kadaSastanak(pocetak: string): string {
  const dana = danaDo(pocetak);
  const sat = new Date(pocetak).toLocaleTimeString('sr-Latn', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (dana === 0) {
    return `Danas u ${sat}`;
  }
  if (dana === 1) {
    return `Sutra u ${sat}`;
  }
  return `Za ${uMnozini(dana, 'dan', 'dana', 'dana')}, u ${sat}`;
}

export function zaDanas({ pregled, sastanci, glasanja, oglasi }: PodaciDanas): StavkaDanas[] {
  const stavke: { vaznost: number; stavka: StavkaDanas }[] = [];
  const dodaj = (vaznost: number, stavka: StavkaDanas) => stavke.push({ vaznost, stavka });

  if (pregled && pregled.hitniKvarovi > 0) {
    dodaj(1, {
      kljuc: 'hitni',
      ikonica: 'pi pi-exclamation-triangle',
      oznaka: 'Hitno',
      naslov: uMnozini(pregled.hitniKvarovi, 'hitan kvar', 'hitna kvara', 'hitnih kvarova'),
      opis: 'Rešavaju se pre svih ostalih.',
      putanja: ['/kvarovi'],
      hitno: true,
    });
  }

  const sastanak = sastanci.find((s) => predstoji(s) && danaDo(s.pocetak) <= DANA_DO_SASTANKA);
  if (sastanak) {
    const dana = danaDo(sastanak.pocetak);
    dodaj(dana <= 1 ? 2 : 8, {
      kljuc: 'sastanak',
      ikonica: 'pi pi-calendar',
      oznaka: kadaSastanak(sastanak.pocetak),
      naslov: sastanak.naslov,
      opis: `${VRSTE_SASTANKA[sastanak.vrsta].naziv} · ${sastanak.lokacija}`,
      putanja: ['/sastanci', sastanak.id],
      hitno: sastanak.hitno,
    });
  }

  const zaGlas = glasanja.filter(cekaMojGlas);
  if (zaGlas.length > 0) {
    const prvo = zaGlas[0];
    const istice = danaDo(prvo.rok);
    dodaj(istice <= 1 ? 3 : 6, {
      kljuc: 'glasanje',
      ikonica: 'pi pi-check-square',
      oznaka:
        zaGlas.length === 1
          ? 'Čeka tvoj glas'
          : `${uMnozini(zaGlas.length, 'glasanje čeka', 'glasanja čekaju', 'glasanja čeka')} tvoj glas`,
      naslov: prvo.pitanje,
      opis:
        istice === 0
          ? 'Ističe danas'
          : istice === 1
            ? 'Ističe sutra'
            : `Ističe za ${uMnozini(istice, 'dan', 'dana', 'dana')}`,
      putanja: ['/glasanje'],
      hitno: false,
    });
  }

  if (pregled && pregled.zahteviNaCekanju > 0) {
    dodaj(4, {
      kljuc: 'zahtevi',
      ikonica: 'pi pi-inbox',
      oznaka: 'Čeka odobrenje',
      naslov: uMnozini(
        pregled.zahteviNaCekanju,
        'zahtev za stan',
        'zahteva za stan',
        'zahteva za stan',
      ),
      opis: 'Stanari čekaju da ih povežeš sa stanom.',
      putanja: ['/zahtevi'],
      hitno: false,
    });
  }

  if (pregled && pregled.noviKvarovi > 0) {
    dodaj(5, {
      kljuc: 'novi',
      ikonica: 'pi pi-wrench',
      oznaka: 'Novo prijavljeno',
      naslov: uMnozini(pregled.noviKvarovi, 'novi kvar', 'nova kvara', 'novih kvarova'),
      opis: 'Prihvati ih ili odbij, pa dodeli serviseru.',
      putanja: ['/kvarovi'],
      hitno: false,
    });
  }

  if (pregled && pregled.neobjavljeneOdluke > 0) {
    dodaj(7, {
      kljuc: 'odluke',
      ikonica: 'pi pi-megaphone',
      oznaka: 'Za objavu',
      naslov: uMnozini(
        pregled.neobjavljeneOdluke,
        'odluka čeka objavu',
        'odluke čekaju objavu',
        'odluka čeka objavu',
      ),
      opis: 'Glasanje je završeno, objavi ishod na oglasnoj tabli.',
      putanja: ['/glasanje'],
      hitno: false,
    });
  }

  const obavestenje = oglasi.find(
    (o) => o.vrsta === 'obavestenje' && -danaDo(o.datumKreiranja) <= DANA_OBAVESTENJA,
  );
  if (obavestenje) {
    dodaj(obavestenje.vazno ? 3 : 9, {
      kljuc: 'obavestenje',
      ikonica: 'pi pi-megaphone',
      oznaka: obavestenje.vazno ? 'Važno obaveštenje' : 'Obaveštenje',
      naslov: obavestenje.naslov,
      opis: obavestenje.tekst,
      putanja: ['/oglasi'],
      hitno: obavestenje.vazno,
    });
  }

  return stavke.sort((a, b) => a.vaznost - b.vaznost).map(({ stavka }) => stavka);
}
