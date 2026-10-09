import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { SpratPipe } from '../../../shared/sprat-pipe';
import { AuthStore } from '../../auth/sesija/auth-store';
import { NAZIVI_KATEGORIJA_KVARA, NAZIVI_STATUSA_KVARA, StanjeKvara } from '../kvar-models';
import { KVAROVA_PO_STRANI, KvarStore } from '../kvar-store';

@Component({
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    MessageModule,
    PaginatorModule,
    SelectButtonModule,
    SkeletonModule,
    SpratPipe,
  ],
  providers: [KvarStore],
  selector: 'app-lista-kvarova',
  styleUrl: './lista-kvarova.scss',
  templateUrl: './lista-kvarova.html',
})
export class ListaKvarova {
  protected readonly store = inject(KvarStore);
  private authStore = inject(AuthStore);

  protected readonly poStrani = KVAROVA_PO_STRANI;
  protected readonly naziviStatusa = NAZIVI_STATUSA_KVARA;
  protected readonly naziviKategorija = NAZIVI_KATEGORIJA_KVARA;

  // Samo admin vidi kvarove više zgrada, pa samo njemu treba naziv zgrade
  protected readonly prikaziZgradu = computed(() => this.authStore.korisnik()?.uloga === 'admin');

  protected readonly filteri: { label: string; value: StanjeKvara }[] = [
    { label: 'Aktivni', value: 'aktivni' },
    { label: 'Završeni', value: 'zavrseni' },
  ];

  protected promeniStranu(event: PaginatorState): void {
    this.store.promeniStranu((event.page ?? 0) + 1);
  }
}
