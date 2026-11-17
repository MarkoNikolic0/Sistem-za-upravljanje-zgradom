import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-email-veza',
  template: `<a [href]="'mailto:' + adresa()">{{ delovi()[0] }}<wbr />{{ delovi()[1] }}</a>`,
})
export class EmailVeza {
  readonly adresa = input.required<string>();

  protected readonly delovi = computed(() => {
    const adresa = this.adresa();
    const et = adresa.lastIndexOf('@');
    return et > 0 ? [adresa.slice(0, et), adresa.slice(et)] : [adresa, ''];
  });
}
