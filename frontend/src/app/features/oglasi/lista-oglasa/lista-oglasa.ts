import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { FormaRazloga } from '../../../shared/forma-razloga/forma-razloga';
import { Paginacija } from '../../../shared/paginacija/paginacija';
import { NAZIVI_ULOGA } from '../../auth/auth-models';
import { ListaOglasaStore } from '../lista-oglasa-store';
import { Oglas, StanjeNavigacijeOglasa, VRSTE_OGLASA, VrstaOglasa } from '../oglas-models';
import { injectZgradeOglasa } from '../zgrade-oglasa';
import { formatRoka } from '../pravila-oglasa';

@Component({
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    FormaRazloga,
    Paginacija,
  ],
  providers: [ListaOglasaStore, ConfirmationService],
  selector: 'app-lista-oglasa',
  styleUrl: './lista-oglasa.scss',
  templateUrl: './lista-oglasa.html',
})
export class ListaOglasa {
  protected readonly store = inject(ListaOglasaStore);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  private readonly fokusiraj = fokusPosleCrtanja();

  protected readonly vrste = VRSTE_OGLASA;
  protected readonly naziviUloga = NAZIVI_ULOGA;
  protected readonly formatRoka = formatRoka;
  protected readonly opcijeVrsta = [
    { value: null, label: 'Sve vrste' },
    ...Object.entries(VRSTE_OGLASA).map(([value, opis]) => ({
      value: value as VrstaOglasa,
      label: opis.naziv,
    })),
  ];

  private readonly zgradeOglasa = injectZgradeOglasa();
  protected readonly zgrade = this.zgradeOglasa.zgrade;
  protected readonly opcijeZgrada = computed(() => [
    { id: null, naziv: 'Sve zgrade' },
    ...this.zgrade(),
  ]);
  protected readonly bezZgrade = computed(
    () =>
      this.zgradeOglasa.profil.hasValue() &&
      !this.zgradeOglasa.admin() &&
      this.zgrade().length === 0,
  );

  protected readonly sakrivanjeId = signal<number | null>(null);

  constructor() {
    const navigacija = this.router.currentNavigation();
    const stanje = navigacija?.extras.state as StanjeNavigacijeOglasa | undefined;
    if (navigacija?.trigger === 'imperative' && stanje?.poruka) {
      this.store.prikaziPoruku(stanje.poruka);
      // Raspored posle navigacije fokusira sadržaj, pa poruku fokusiramo tek kad se lista učita
      const cekaListu = effect(() => {
        if (this.store.isFulfilled()) {
          this.fokusiraj('#poruka-oglasa');
          cekaListu.destroy();
        }
      });
    }
  }

  protected detaljiAutora(oglas: Oglas): string {
    return [
      oglas.autor.uloga === 'stanar' ? null : this.naziviUloga[oglas.autor.uloga],
      oglas.datumIzmene ? 'izmenjeno' : null,
      this.zgrade().length > 1 ? oglas.zgrada.naziv : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  protected obrisi(event: Event, oglas: Oglas): void {
    const dugme = event.currentTarget as HTMLElement;
    this.confirmationService.confirm({
      header: 'Brisanje oglasa',
      message: `Obrisati oglas „${oglas.naslov}“? Ovo ne može da se poništi.`,
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Obriši', severity: 'danger' },
      accept: async () => {
        await this.store.obrisi(oglas.id);
        this.fokusiraj('#poruka-oglasa');
      },
      reject: () => dugme.focus(),
    });
  }

  protected async sakrij(oglas: Oglas, razlog: string): Promise<void> {
    if (await this.store.sakrij(oglas.id, razlog)) {
      this.sakrivanjeId.set(null);
    }
    this.fokusiraj('#poruka-oglasa');
  }

  protected async obnovi(oglas: Oglas): Promise<void> {
    await this.store.obnovi(oglas.id);
    this.fokusiraj('#poruka-oglasa');
  }

  protected odustaniOdSakrivanja(oglas: Oglas): void {
    this.sakrivanjeId.set(null);
    this.fokusiraj(`#sakrij-${oglas.id}`);
  }
}
