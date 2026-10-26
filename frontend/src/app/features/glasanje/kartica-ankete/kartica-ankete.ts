import { Component, computed, input, output } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { NAZIVI_ULOGA } from '../../auth/auth-models';
import { formatRoka } from '../../../shared/datum';
import { Glasanje, OpcijaGlasanja } from '../glasanje-models';
import { glasova, istice, isticeUskoro, udeo, uProcentima, vodece } from '../pravila-glasanja';

@Component({
  imports: [DatePipe, NgTemplateOutlet, ButtonModule, MessageModule],
  selector: 'app-kartica-ankete',
  styleUrl: './kartica-ankete.scss',
  templateUrl: './kartica-ankete.html',
})
export class KarticaAnkete {
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

  protected readonly vidiRezultate = computed(() =>
    this.glasanje().opcije.every((o) => o.brojGlasova !== null),
  );
  protected readonly vodece = computed(() =>
    this.glasanje().zavrseno ? vodece(this.glasanje()) : [],
  );
  protected readonly istice = computed(() => istice(this.glasanje().rok));
  protected readonly uskoro = computed(() => isticeUskoro(this.glasanje().rok));
  protected readonly ucesce = computed(() =>
    udeo(this.glasanje().brojGlasaca, this.glasanje().brojStanara),
  );

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
