import { Glasanje } from './glasanje.entity.js';
import { type PristupZgradama, sadrzi } from '../korisnik/pristup-zgradama.js';
import { VrstaGlasanja } from '../shared/enums/glasanje.enums.js';
import { ZA, ishodOdluke, pragoviOdluke } from './ishod-odluke.js';

// Glas u odluci za stan u kojem je korisnik vlasnik
export interface GlasStana {
  glasanjeId: number;
  opcijaId: number;
  stan: string;
  moj: boolean;
}

// Podaci iz baze za više glasanja odjednom
export interface PodaciGlasanja {
  brojPoOpciji: Map<number, number>;
  mojGlasPoAnketi: Map<number, number>;
  stanaraPoZgradi: Map<number, number>;
  oglasPoOdluci: Map<number | undefined, number>;
  glasoviStanova: GlasStana[];
}

export function prikazGlasanja(
  glasanje: Glasanje,
  p: PristupZgradama,
  podaci: PodaciGlasanja,
  sada: Date,
) {
  const zgradaId = glasanje.zgrada.id;
  const odluka = glasanje.vrsta === VrstaGlasanja.ODLUKA;
  const zavrseno = glasanje.rok <= sada;
  const upravlja = sadrzi(p.upravlja, zgradaId);

  const brojMojihStanova = p.vlasnickiStanovi.filter(
    (stan) => stan.zgradaId === zgradaId,
  ).length;
  const glasoviMojihStanova = podaci.glasoviStanova.filter(
    (glas) => glas.glasanjeId === glasanje.id,
  );
  const mojGlas = odluka
    ? (glasoviMojihStanova.find((glas) => glas.moj)?.opcijaId ?? null)
    : (podaci.mojGlasPoAnketi.get(glasanje.id) ?? null);
  // U odluci glasa vlasnik koji je već glasao ili ima stan za koji niko nije glasao
  const imaPravoGlasa = odluka
    ? mojGlas !== null || brojMojihStanova > glasoviMojihStanova.length
    : p.stanuje.includes(zgradaId);
  // Stanar vidi rezultate tek kad je glasano za njega (u odluci za njegov stan),
  // da ga tuđi glasovi ne bi usmerili
  const vidiRezultate =
    upravlja || zavrseno || mojGlas !== null || glasoviMojihStanova.length > 0;

  const opcije = glasanje.opcije.toSorted((a, b) => a.id - b.id);
  const brojevi = opcije.map((o) => podaci.brojPoOpciji.get(o.id) ?? 0);
  const brojGlasaca = brojevi.reduce((zbir, broj) => zbir + broj, 0);
  const ukupnoGlasaca = odluka
    ? (glasanje.ukupnoStanova ?? 0)
    : (podaci.stanaraPoZgradi.get(zgradaId) ?? 0);
  const za = brojevi[opcije.findIndex((o) => o.tekst === ZA)] ?? 0;
  const oglasId = podaci.oglasPoOdluci.get(glasanje.id) ?? null;

  return Object.assign(glasanje, {
    opcije: opcije.map((opcija, i) => ({
      id: opcija.id,
      tekst: opcija.tekst,
      brojGlasova: vidiRezultate ? brojevi[i] : null,
    })),
    mojGlas,
    glasaliSuvlasnici: glasoviMojihStanova
      .filter((glas) => !glas.moj)
      .map((glas) => glas.stan),
    brojGlasaca,
    brojZa: odluka && vidiRezultate ? za : null,
    ukupnoGlasaca,
    zavrseno,
    ishod:
      glasanje.vecina !== null && zavrseno
        ? ishodOdluke(glasanje.vecina, za, brojGlasaca, ukupnoGlasaca)
        : null,
    pragovi:
      glasanje.vecina === null
        ? null
        : pragoviOdluke(glasanje.vecina, brojGlasaca, ukupnoGlasaca),
    oglasId,
    smeDaGlasa: !zavrseno && imaPravoGlasa,
    smeDaZatvori: !zavrseno && !odluka && upravlja,
    smeDaObrise: upravlja,
    smeDaObjavi: zavrseno && odluka && upravlja && oglasId === null,
  });
}
