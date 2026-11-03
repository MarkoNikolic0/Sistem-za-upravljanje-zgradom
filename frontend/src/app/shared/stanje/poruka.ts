export interface Poruka {
  tip: 'uspeh' | 'greska';
  tekst: string;
}

export interface StanjeNavigacije {
  poruka?: Poruka;
}
