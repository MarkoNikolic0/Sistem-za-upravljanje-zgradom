export interface Stanar {
  id: number;
  vlasnik: boolean;
  korisnik: {
    id: number;
    ime: string;
    prezime: string;
    email: string;
    telefon: string;
  };
}

export interface StanSaStanarima {
  id: number;
  broj: string;
  sprat: number;
  stanari: Stanar[];
}
