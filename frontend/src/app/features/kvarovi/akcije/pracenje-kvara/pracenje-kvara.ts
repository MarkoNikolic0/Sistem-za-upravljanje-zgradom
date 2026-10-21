import { Component, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { KvarDetalj } from '../../kvar-models';
import { DetaljKvaraStore } from '../../detalj-kvara-store';
import { BrojStanaraPipe } from '../../../../shared/pipes/broj-stanara-pipe';

@Component({
  imports: [ButtonModule, BrojStanaraPipe],
  selector: 'app-pracenje-kvara',
  styleUrl: './pracenje-kvara.scss',
  templateUrl: './pracenje-kvara.html',
})
export class PracenjeKvara {
  protected readonly store = inject(DetaljKvaraStore);

  readonly kvar = input.required<KvarDetalj>();
}
