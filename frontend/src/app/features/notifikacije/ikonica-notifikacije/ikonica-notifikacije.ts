import { Component, computed, input } from '@angular/core';
import { BOJE_NOTIFIKACIJA, IKONICE_NOTIFIKACIJA, TipNotifikacije } from '../notifikacija-models';

@Component({
  selector: 'app-ikonica-notifikacije',
  host: { class: 'plocica-ikonice', 'aria-hidden': 'true', '[style.--boja]': 'boja()' },
  template: `<i [class]="ikonica()"></i>`,
})
export class IkonicaNotifikacije {
  readonly tip = input.required<TipNotifikacije>();

  protected readonly ikonica = computed(() => IKONICE_NOTIFIKACIJA[this.tip()]);
  protected readonly boja = computed(() => BOJE_NOTIFIKACIJA[this.tip()]);
}
