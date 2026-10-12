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
import { ProfileService } from '../../profile/profile-service';
import { RouterLink } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { KvarService } from '../kvar-service';

@Component({
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    MessageModule,
    PaginatorModule,
    SelectModule,
    SelectButtonModule,
    SkeletonModule,
    SpratPipe,
    RouterLink,
  ],
  selector: 'app-lista-kvarova',
  styleUrl: './lista-kvarova.scss',
  templateUrl: './lista-kvarova.html',
})
export class ListaKvarova {
  protected readonly store = inject(KvarStore);
  private authStore = inject(AuthStore);
  private profileService = inject(ProfileService);
  private kvarService = inject(KvarService);

  protected readonly poStrani = KVAROVA_PO_STRANI;
  protected readonly naziviStatusa = NAZIVI_STATUSA_KVARA;
  protected readonly naziviKategorija = NAZIVI_KATEGORIJA_KVARA;

  private readonly uloga = computed(() => this.authStore.korisnik()?.uloga);
  protected readonly prikaziZgradu = computed(
    () => this.uloga() === 'admin' || this.uloga() === 'serviser',
  );
  protected readonly serviser = computed(() => this.uloga() === 'serviser');
  protected readonly zgrade = this.kvarService.zgradeSaKvarovima(this.prikaziZgradu);
  protected readonly opcijeZgrada = computed(() => [
    { id: null, naziv: 'Sve zgrade' },
    ...this.zgrade.value(),
  ]);

  private readonly profil = this.profileService.profile();
  protected readonly imaStan = computed(
    () => this.profil.hasValue() && this.profil.value().stanovi.length > 0,
  );
  protected readonly stanarBezStana = computed(
    () =>
      this.profil.hasValue() &&
      this.profil.value().uloga === 'stanar' &&
      this.profil.value().stanovi.length === 0,
  );

  protected readonly filteri: { label: string; value: StanjeKvara }[] = [
    { label: 'Aktivni', value: 'aktivni' },
    { label: 'Završeni', value: 'zavrseni' },
  ];

  constructor() {
    this.store.prikaziListu();
  }

  protected promeniStranu(event: PaginatorState): void {
    this.store.promeniStranu((event.page ?? 0) + 1);
  }
}
