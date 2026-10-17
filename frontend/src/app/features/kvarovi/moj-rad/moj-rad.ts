import { Component, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { KvarDetalj } from '../kvar-models';
import { KvarStore } from '../kvar-store';
import { RazlogVracanja } from '../razlog-vracanja/razlog-vracanja';

@Component({
  imports: [ButtonModule, RazlogVracanja],
  selector: 'app-moj-rad',
  styleUrl: './moj-rad.scss',
  templateUrl: './moj-rad.html',
})
export class MojRad {
  protected readonly store = inject(KvarStore);

  readonly kvar = input.required<KvarDetalj>();
}
