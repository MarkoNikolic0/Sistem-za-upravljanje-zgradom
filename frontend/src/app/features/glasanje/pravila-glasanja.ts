import { AbstractControl, ValidationErrors } from '@angular/forms';
import { MS_PO_DANU } from '../../shared/datum';
import { Glasanje, IshodOdluke, ZA } from './glasanje-models';

const nabrajanje = new Intl.ListFormat('sr-Latn', { type: 'conjunction' });

export const DANA_ANKETE = 7;
export const NAJVISE_DANA_ANKETE = 30;

const relativno = new Intl.RelativeTimeFormat('sr-Latn', { numeric: 'auto' });
const procenat = new Intl.NumberFormat('sr-Latn', { style: 'percent', maximumFractionDigits: 0 });

// Broj kalendarskih dana do roka (0 = danas), da „sutra“ važi i kad je rok sutra ujutru
function danaDoRoka(rok: string, sada = new Date()): number {
  const kraj = new Date(rok);
  const danKraja = new Date(kraj.getFullYear(), kraj.getMonth(), kraj.getDate());
  const danas = new Date(sada.getFullYear(), sada.getMonth(), sada.getDate());
  return Math.round((danKraja.getTime() - danas.getTime()) / MS_PO_DANU);
}

// „ističe danas“, „ističe sutra“, „ističe za 5 dana“
export function istice(rok: string): string {
  return `ističe ${relativno.format(danaDoRoka(rok), 'day')}`;
}

export function isticeUskoro(rok: string): boolean {
  return danaDoRoka(rok) <= 1;
}

const mnozina = new Intl.PluralRules('sr-Latn');

function uMnozini(broj: number, one: string, few: string, other: string): string {
  const oblik = mnozina.select(broj);
  return `${broj} ${oblik === 'one' ? one : oblik === 'few' ? few : other}`;
}

export function glasova(broj: number): string {
  return uMnozini(broj, 'glas', 'glasa', 'glasova');
}

export function stanova(broj: number): string {
  return uMnozini(broj, 'stan', 'stana', 'stanova');
}

export function glasoviZa(glasanje: Glasanje): number | null {
  return glasanje.opcije.find((o) => o.tekst === ZA)?.brojGlasova ?? null;
}

export function udeo(broj: number, ukupno: number): number {
  return ukupno === 0 ? 0 : broj / ukupno;
}

export function uProcentima(deo: number): string {
  return procenat.format(deo);
}

export function vodece(glasanje: Glasanje): number[] {
  const najvise = Math.max(...glasanje.opcije.map((o) => o.brojGlasova ?? 0));
  return najvise === 0
    ? []
    : glasanje.opcije.filter((o) => o.brojGlasova === najvise).map((o) => o.id);
}

export function razliciteOpcije(polje: AbstractControl<string[]>): ValidationErrors | null {
  const opcije = polje.value.map((o) => o.trim().toLocaleLowerCase('sr')).filter(Boolean);
  return new Set(opcije).size === opcije.length ? null : { iste: true };
}

export function glasaliSuvlasnici(stanovi: string[]): string {
  return stanovi.length === 1
    ? `Za stan ${stanovi[0]} je glasao suvlasnik.`
    : `Za stanove ${nabrajanje.format(stanovi)} su glasali suvlasnici.`;
}

export function detaljIshoda(glasanje: Glasanje): string {
  const { ishod, pragovi, brojGlasaca, ukupnoGlasaca, vecina } = glasanje;
  if (!pragovi) {
    return '';
  }
  if (ishod === 'nema_kvoruma') {
    return `Potrebno je da glasa najmanje ${stanova(pragovi.kvorum)}.`;
  }
  const za = glasoviZa(glasanje) ?? 0;
  return vecina === 'dve_trecine'
    ? `Za ${za}, potrebno ${pragovi.potrebnoZa} od ${stanova(ukupnoGlasaca)}.`
    : `Za ${za} od ${glasova(brojGlasaca)}, potrebno ${pragovi.potrebnoZa}.`;
}

const NASLOVI_OBJAVE: Record<IshodOdluke, string> = {
  usvojena: 'Usvojena odluka',
  odbijena: 'Nije usvojena odluka',
  nema_kvoruma: 'Odluka nije doneta',
};

export function objavaOdluke(glasanje: Glasanje, maksNaslov: number) {
  const ishod = glasanje.ishod ?? 'nema_kvoruma';
  const naslov = `${NASLOVI_OBJAVE[ishod]}: ${glasanje.pitanje}`;
  const brojevi = glasanje.opcije.map((o) => `${o.tekst} ${o.brojGlasova ?? 0}`).join(', ');
  const odziv = `glasalo je ${glasanje.brojGlasaca} od ${stanova(glasanje.ukupnoGlasaca)}`;
  const uvod = {
    usvojena: 'Skupština stambene zajednice je usvojila odluku',
    odbijena: 'Skupština stambene zajednice nije usvojila odluku',
    nema_kvoruma: 'Odluka nije doneta jer nije bilo kvoruma',
  }[ishod];
  const potrebno = glasanje.pragovi
    ? {
        usvojena: '',
        odbijena:
          glasanje.vecina === 'dve_trecine'
            ? ` Za usvajanje je bilo potrebno ${glasanje.pragovi.potrebnoZa} glasova Za.`
            : ' Za usvajanje je bilo potrebno više od pola glasova Za.',
        nema_kvoruma: ` Potrebno je bilo najmanje ${stanova(glasanje.pragovi.kvorum)}.`,
      }[ishod]
    : '';
  return {
    naslov: naslov.length > maksNaslov ? `${naslov.slice(0, maksNaslov - 1)}…` : naslov,
    tekst: `${uvod}: „${glasanje.pitanje}“.\n${brojevi}; ${odziv}.${potrebno}`,
  };
}
