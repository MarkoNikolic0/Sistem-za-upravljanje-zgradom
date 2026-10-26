import { Component, computed, input, output } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { NAZIVI_ULOGA } from '../../auth/auth-models';
import { formatRoka } from '../../../shared/datum';
import { Glasanje, OpcijaGlasanja, VECINE_ODLUKE } from '../glasanje-models';
import {
  glasaliSuvlasnici,
  glasova,
  istice,
  isticeUskoro,
  udeo,
  uProcentima,
  vodece,
} from '../pravila-glasanja';
import { StanjeOdluke } from '../stanje-odluke/stanje-odluke';
import { RouterLink } from '@angular/router';

@Component({
  imports: [DatePipe, NgTemplateOutlet, RouterLink, ButtonModule, MessageModule, StanjeOdluke],
  selector: 'app-kartica-glasanja',
  styleUrl: './kartica-glasanja.scss',
  templateUrl: './kartica-glasanja.html',
})
export class KarticaGlasanja {
  readonly glasanje = input.required<Glasanje>();
  readonly uToku = input(false);
  readonly greska = input<string | null>(null);
  readonly prikaziZgradu = input(false);
  readonly akcijaUToku = input(false);

  readonly glasaj = output<number>();
  readonly povuci = output();
  readonly zatvori = output<Event>();
  readonly obrisi = output<Event>();

  protected readonly formatRoka = formatRoka;
  protected readonly naziviUloga = NAZIVI_ULOGA;
  protected readonly vecine = VECINE_ODLUKE;

  protected readonly vidiRezultate = computed(() =>
    this.glasanje().opcije.every((o) => o.brojGlasova !== null),
  );
  protected readonly vodece = computed(() =>
    this.glasanje().zavrseno ? vodece(this.glasanje()) : [],
  );
  protected readonly istice = computed(() => istice(this.glasanje().rok));
  protected readonly uskoro = computed(() => isticeUskoro(this.glasanje().rok));
  protected readonly ucesce = computed(() =>
    udeo(this.glasanje().brojGlasaca, this.glasanje().ukupnoGlasaca),
  );

  protected readonly suvlasnici = computed(() => {
    const stanovi = this.glasanje().glasaliSuvlasnici;
    return stanovi.length === 0 ? null : glasaliSuvlasnici(stanovi);
  });

  protected udeoOpcije(opcija: OpcijaGlasanja): number {
    return udeo(opcija.brojGlasova ?? 0, this.glasanje().brojGlasaca);
  }

  protected readonly uProcentima = uProcentima;
  protected readonly glasova = glasova;

  protected izaberi(opcija: OpcijaGlasanja): void {
    if (!this.uToku() && opcija.id !== this.glasanje().mojGlas) {
      this.glasaj.emit(opcija.id);
    }
  }
}
