import { Component, DOCUMENT, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { filter } from 'rxjs';
import { Instalacija } from './features/pwa/instalacija';

const KLJUC_VERZIJE = 'nova-verzija';

@Component({
  imports: [RouterOutlet, ToastModule, ButtonModule],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private messageService = inject(MessageService);
  private document = inject(DOCUMENT);
  protected readonly kljucVerzije = KLJUC_VERZIJE;

  constructor() {
    inject(Instalacija).pokreni();
    const swUpdate = inject(SwUpdate);
    if (!swUpdate.isEnabled) {
      return;
    }
    swUpdate.versionUpdates
      .pipe(
        filter((dogadjaj) => dogadjaj.type === 'VERSION_READY'),
        takeUntilDestroyed(),
      )
      .subscribe(() =>
        this.ponudiOsvezavanje(
          'Dostupna je nova verzija aplikacije.',
          'Osveži da bi koristio najnoviju verziju.',
        ),
      );
    swUpdate.unrecoverable
      .pipe(takeUntilDestroyed())
      .subscribe(() =>
        this.ponudiOsvezavanje(
          'Aplikacija mora ponovo da se učita.',
          'Deo aplikacije više nije dostupan na uređaju.',
        ),
      );
  }

  protected osvezi(): void {
    this.document.location.reload();
  }

  private ponudiOsvezavanje(summary: string, detail: string): void {
    this.messageService.clear(KLJUC_VERZIJE);
    this.messageService.add({ key: KLJUC_VERZIJE, sticky: true, closable: false, summary, detail });
  }
}
