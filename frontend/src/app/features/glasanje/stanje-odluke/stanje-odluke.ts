import { Component, computed, input } from '@angular/core';
import { Glasanje, ISHODI_ODLUKE } from '../glasanje-models';
import { detaljIshoda, glasova, stanova, udeo, uProcentima } from '../pravila-glasanja';

const IKONICE_ISHODA = {
  usvojena: 'pi-check-circle',
  odbijena: 'pi-times-circle',
  nema_kvoruma: 'pi-minus-circle',
} as const;

@Component({
  selector: 'app-stanje-odluke',
  styleUrl: './stanje-odluke.scss',
  templateUrl: './stanje-odluke.html',
})
export class StanjeOdluke {
  readonly glasanje = input.required<Glasanje>();

  protected readonly nazivi = ISHODI_ODLUKE;
  protected readonly ikonice = IKONICE_ISHODA;
  protected readonly stanova = stanova;
  protected readonly glasova = glasova;
  protected readonly uProcentima = uProcentima;

  protected readonly detalj = computed(() => detaljIshoda(this.glasanje()));
  protected readonly ucesce = computed(() =>
    udeo(this.glasanje().brojGlasaca, this.glasanje().ukupnoGlasaca),
  );
  protected readonly polozajKvoruma = computed(() =>
    udeo(this.glasanje().pragovi?.kvorum ?? 0, this.glasanje().ukupnoGlasaca),
  );
}
