import { afterRenderEffect, Component, DOCUMENT, inject, input } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonDirective } from 'primeng/button';
import { Toast } from 'primeng/toast';

export interface PorukaVerzije {
  naslov: string;
  opis: string;
}

const KLJUC_VERZIJE = 'nova-verzija';

@Component({
  imports: [Toast, ButtonDirective],
  selector: 'app-nova-verzija',
  styleUrl: './nova-verzija.scss',
  templateUrl: './nova-verzija.html',
})
export class NovaVerzija {
  private messageService = inject(MessageService);
  private document = inject(DOCUMENT);
  protected readonly kljucVerzije = KLJUC_VERZIJE;

  readonly poruka = input.required<PorukaVerzije>();

  constructor() {
    afterRenderEffect(() => {
      const { naslov, opis } = this.poruka();
      this.messageService.clear(KLJUC_VERZIJE);
      this.messageService.add({
        key: KLJUC_VERZIJE,
        sticky: true,
        closable: false,
        summary: naslov,
        detail: opis,
      });
    });
  }

  protected osvezi(): void {
    this.document.location.reload();
  }
}
