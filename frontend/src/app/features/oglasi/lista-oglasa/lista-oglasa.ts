import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { Store } from '@ngrx/store';
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
import { FormaRazloga } from '../../../shared/forme/forma-razloga/forma-razloga';
import { Paginacija } from '../../../shared/liste/paginacija/paginacija';
import { NAZIVI_ULOGA } from '../../auth/auth-models';
import { ListaOglasaStore } from '../lista-oglasa-store';
import { Oglas, VRSTE_OGLASA, VrstaOglasa } from '../oglas-models';
import { formatRoka } from '../../../shared/tekst/datum';
import { PriloziOglasa } from '../prilozi-oglasa/prilozi-oglasa';
import { injectZgradeKorisnika } from '../../zgrade/zgrade-korisnika';
import { StanjeNavigacije } from '../../../shared/stanje/poruka';
import { AuthStore } from '../../auth/sesija/auth-store';
import { NeprocitaniOglasiActions } from '../neprocitani-oglasi-store/neprocitani-oglasi-actions';
import { neprocitaniOglasiFeature } from '../neprocitani-oglasi-store/neprocitani-oglasi-reducer';
import { jeNov } from '../pravila-oglasa';
import { dugmadPotvrde } from '../../../shared/dugmad-potvrde';
import { PokusajPonovo } from '../../../shared/pokusaj-ponovo';
import { osveziNaPromenu } from '../../notifikacije/osvezi-na-promenu';

@Component({
  imports: [
    PokusajPonovo,
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
    PriloziOglasa,
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
  private authStore = inject(AuthStore);
  private globalniStore = inject(Store);
  private readonly fokusiraj = fokusPosleCrtanja();
  private readonly noviPosle = this.globalniStore.selectSignal(
    neprocitaniOglasiFeature.selectNoviPosle,
  );
  private readonly osvezenja = this.globalniStore.selectSignal(
    neprocitaniOglasiFeature.selectOsvezenja,
  );

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

  private readonly zgradeOglasa = injectZgradeKorisnika();
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
    this.globalniStore.dispatch(NeprocitaniOglasiActions.listaOtvorena());
    inject(DestroyRef).onDestroy(() =>
      this.globalniStore.dispatch(NeprocitaniOglasiActions.listaZatvorena()),
    );
    effect(() => {
      if (this.osvezenja() > 0) {
        untracked(() => this.store.ucitaj());
      }
    });
    osveziNaPromenu('oglas', (ids) => this.store.osveziOglase(ids));

    const navigacija = this.router.currentNavigation();
    const stanje = navigacija?.extras.state as StanjeNavigacije | undefined;
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

  protected jeNov(oglas: Oglas): boolean {
    return jeNov(oglas, this.noviPosle(), this.authStore.korisnik()?.id);
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
      message:
        oglas.autor.id === this.authStore.korisnik()?.id
          ? `Obrisati oglas „${oglas.naslov}“? Ovo ne može da se poništi.`
          : `Obrisati sakriven oglas „${oglas.naslov}“ (${oglas.autor.ime} ${oglas.autor.prezime}) sa prilozima? Ovo ne može da se poništi.`,
      ...dugmadPotvrde('Obriši', true),
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
