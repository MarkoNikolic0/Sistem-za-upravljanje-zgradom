import { Component, computed, input } from '@angular/core';
import { formatirajTelefon } from '../../../shared/telefon';
import { KontaktZgrade } from '../kontakt-models';

@Component({
  selector: 'app-red-kontakta',
  templateUrl: './red-kontakta.html',
  styleUrl: './red-kontakta.scss',
})
export class RedKontakta {
  readonly kontakt = input.required<KontaktZgrade>();

  protected readonly broj = computed(() => formatirajTelefon(this.kontakt().telefon));
}
