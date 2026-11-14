import { TipNotifikacije } from '../notifikacija.entity.js';

export const TRAJANJE_PUSH_S = 24 * 60 * 60;
export const NAJDUZI_TEKST_PUSH = 300;
export const ISTEKLA_PRETPLATA = [404, 410];
export const ISTOVREMENO_PUSH = 20;

export const SERVISI_ZA_PUSH = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
  /^web\.push\.apple\.com$/,
];

export const NASLOVI_PUSH: Record<TipNotifikacije, string> = {
  [TipNotifikacije.KVAR_PRIJAVLJEN]: 'Prijavljen kvar',
  [TipNotifikacije.KVAR_STATUS]: 'Promenjen status kvara',
  [TipNotifikacije.KVAR_DODELJEN]: 'Dodeljen kvar',
  [TipNotifikacije.KVAR_DOLAZAK]: 'Zakazan dolazak servisera',
  [TipNotifikacije.KVAR_KOMENTAR]: 'Nov komentar',
  [TipNotifikacije.ZAHTEV_NOVI]: 'Nov zahtev',
  [TipNotifikacije.ZAHTEV_OBRADJEN]: 'Zahtev je obrađen',
  [TipNotifikacije.SASTANAK_NOVI]: 'Zakazan sastanak',
  [TipNotifikacije.SASTANAK_IZMENJEN]: 'Sastanak je izmenjen',
  [TipNotifikacije.SASTANAK_OTKAZAN]: 'Sastanak je otkazan',
  [TipNotifikacije.GLASANJE_NOVO]: 'Novo glasanje',
  [TipNotifikacije.VAZNO_OBAVESTENJE]: 'Važno obaveštenje',
};
