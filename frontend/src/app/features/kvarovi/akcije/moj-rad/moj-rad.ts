import { Component, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { KvarDetalj } from '../../kvar-models';
import { KvarStore } from '../../kvar-store';
import { RazlogVracanja } from '../razlog-vracanja/razlog-vracanja';
import { DolazakServisera } from '../dolazak-servisera/dolazak-servisera';

@Component({
  imports: [ButtonModule, RazlogVracanja, DolazakServisera],
  selector: 'app-moj-rad',
  styleUrl: './moj-rad.scss',
  templateUrl: './moj-rad.html',
})
export class MojRad {
  protected readonly store = inject(KvarStore);

  readonly kvar = input.required<KvarDetalj>();
}
