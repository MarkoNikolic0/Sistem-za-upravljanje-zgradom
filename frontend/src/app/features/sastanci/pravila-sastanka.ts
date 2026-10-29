import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { danaDo, zaDana } from '../../shared/datum';
import { uMnozini } from '../../shared/mnozina';
import { imaPonavljanja } from '../../shared/ponavljanje';
import { Sastanak, VrstaSastanka } from './sastanak-models';

// Zakon: poziv za sednicu skupštine najmanje tri dana pre, osim u hitnim slučajevima
export const DANA_ZA_POZIV = 3;
export const NAJVISE_DANA_UNAPRED = 365;

const relativno = new Intl.RelativeTimeFormat('sr-Latn', { numeric: 'auto' });
const mesec = new Intl.DateTimeFormat('sr-Latn', { month: 'long', year: 'numeric' });

// „danas“, „sutra“, „za 5 dana“, „pre 2 dana“
export function kadaJe(pocetak: string): string {
  return relativno.format(danaDo(pocetak), 'day');
}

export function tacaka(broj: number): string {
  return uMnozini(broj, 'tačka', 'tačke', 'tačaka');
}

export function jeSkupstinaSaRokom(vrsta: VrstaSastanka, hitno: boolean): boolean {
  return vrsta === 'skupstina' && !hitno;
}

// Prvi dan koji može da se izabere: skupština bar tri dana unapred, ostalo od danas
export function najranijiDan(vrsta: VrstaSastanka, hitno: boolean): Date {
  return zaDana(jeSkupstinaSaRokom(vrsta, hitno) ? DANA_ZA_POZIV : 0);
}

// Predlog termina u 18 časova: prvi dozvoljen dan, ili sutra ako je to vreme danas prošlo
export function predlozenTermin(vrsta: VrstaSastanka, hitno: boolean): Date {
  const dan = najranijiDan(vrsta, hitno);
  const uOsamnaest = (dodatak: number) =>
    new Date(dan.getFullYear(), dan.getMonth(), dan.getDate() + dodatak, 18);
  return uOsamnaest(0).getTime() > Date.now() ? uOsamnaest(0) : uOsamnaest(1);
}

interface Termin {
  vrsta: VrstaSastanka;
  pocetak: Date | null;
  hitno: boolean;
}

// Kao na serveru: rok za poziv se proverava iznova samo kad se menja termin, vrsta ili hitnost
export function rokPoziva(pocetni: () => Termin | null): ValidatorFn {
  return (forma: AbstractControl): ValidationErrors | null => {
    const { vrsta, pocetak, hitno } = forma.getRawValue() as Termin;
    if (!pocetak) {
      return null;
    }
    const stari = pocetni();
    if (
      stari &&
      stari.pocetak?.getTime() === pocetak.getTime() &&
      stari.vrsta === vrsta &&
      stari.hitno === hitno
    ) {
      return null;
    }
    if (pocetak.getTime() <= Date.now()) {
      return { proslost: true };
    }
    return jeSkupstinaSaRokom(vrsta, hitno) && danaDo(pocetak) < DANA_ZA_POZIV
      ? { rokPoziva: true }
      : null;
  };
}

// Ista odluka ne sme uz dve tačke; zbor ne šalje odluke, pa se kod njega ne proverava
export function razliciteOdluke(forma: AbstractControl): ValidationErrors | null {
  const { vrsta, tacke } = forma.getRawValue() as {
    vrsta: VrstaSastanka;
    tacke: { odlukaId: number | null }[];
  };
  return vrsta === 'skupstina' && imaPonavljanja(tacke.map((t) => t.odlukaId))
    ? { isteOdluke: true }
    : null;
}

export function poMesecima(sastanci: Sastanak[]): { mesec: string; sastanci: Sastanak[] }[] {
  const grupe = new Map<string, Sastanak[]>();
  for (const sastanak of sastanci) {
    const naziv = mesec.format(new Date(sastanak.pocetak));
    grupe.set(naziv, [...(grupe.get(naziv) ?? []), sastanak]);
  }
  return [...grupe].map(([naziv, uMesecu]) => ({ mesec: naziv, sastanci: uMesecu }));
}
