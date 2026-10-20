import { Component, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { KvarDetalj } from '../../kvar-models';
import { KvarStore } from '../../kvar-store';
import { brojStanara } from '../../pravila-kvara';

@Component({
  imports: [ButtonModule],
  selector: 'app-pracenje-kvara',
  styleUrl: './pracenje-kvara.scss',
  templateUrl: './pracenje-kvara.html',
})
export class PracenjeKvara {
  protected readonly store = inject(KvarStore);

  readonly kvar = input.required<KvarDetalj>();

  protected readonly brojStanara = brojStanara;
}
