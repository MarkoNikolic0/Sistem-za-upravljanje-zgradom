import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { jeSlika, velicinaFajla } from '../../../shared/fajlovi/fajlovi';
import { DokumentZgrade, opisKategorije } from '../dokument-models';

@Component({
  selector: 'app-red-dokumenta',
  imports: [DatePipe],
  templateUrl: './red-dokumenta.html',
  styleUrl: './red-dokumenta.scss',
})
export class RedDokumenta {
  readonly dokument = input.required<DokumentZgrade>();
  readonly saKategorijom = input(false);

  protected readonly slika = computed(() => jeSlika(this.dokument().tip));
  protected readonly kategorija = computed(() => opisKategorije(this.dokument().kategorija).naziv);
  protected readonly fajl = computed(
    () => `${this.slika() ? 'Slika' : 'PDF'}, ${velicinaFajla(this.dokument().velicina)}`,
  );
}
