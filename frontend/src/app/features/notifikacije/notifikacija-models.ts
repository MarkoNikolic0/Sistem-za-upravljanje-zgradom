export type TipNotifikacije =
  | 'kvar_prijavljen'
  | 'kvar_status'
  | 'kvar_dodeljen'
  | 'kvar_dolazak'
  | 'kvar_komentar'
  | 'zahtev_novi'
  | 'zahtev_obradjen'
  | 'sastanak_novi'
  | 'sastanak_izmenjen'
  | 'sastanak_otkazan'
  | 'glasanje_novo'
  | 'vazno_obavestenje';

export interface Notifikacija {
  id: number;
  tip: TipNotifikacije;
  tekst: string;
  link: string | null;
  procitano: boolean;
  datumKreiranja: string;
}

export const IKONICE_NOTIFIKACIJA: Record<TipNotifikacije, string> = {
  kvar_prijavljen: 'pi pi-wrench',
  kvar_status: 'pi pi-wrench',
  kvar_dodeljen: 'pi pi-user-plus',
  kvar_dolazak: 'pi pi-clock',
  kvar_komentar: 'pi pi-comment',
  zahtev_novi: 'pi pi-link',
  zahtev_obradjen: 'pi pi-link',
  sastanak_novi: 'pi pi-calendar',
  sastanak_izmenjen: 'pi pi-calendar',
  sastanak_otkazan: 'pi pi-calendar-times',
  glasanje_novo: 'pi pi-check-square',
  vazno_obavestenje: 'pi pi-megaphone',
};

export const KLJUC_TOASTA = 'notifikacija';

export interface GrupaNotifikacija {
  naziv: string;
  stavke: Notifikacija[];
}

export function poDanima(stavke: Notifikacija[], sada = new Date()): GrupaNotifikacija[] {
  const danas = new Date(sada.getFullYear(), sada.getMonth(), sada.getDate()).getTime();
  const juce = new Date(sada.getFullYear(), sada.getMonth(), sada.getDate() - 1).getTime();
  const grupe: GrupaNotifikacija[] = [
    { naziv: 'Danas', stavke: [] },
    { naziv: 'Juče', stavke: [] },
    { naziv: 'Ranije', stavke: [] },
  ];
  for (const notifikacija of stavke) {
    const vreme = new Date(notifikacija.datumKreiranja).getTime();
    grupe[vreme >= danas ? 0 : vreme >= juce ? 1 : 2].stavke.push(notifikacija);
  }
  return grupe.filter((grupa) => grupa.stavke.length > 0);
}
