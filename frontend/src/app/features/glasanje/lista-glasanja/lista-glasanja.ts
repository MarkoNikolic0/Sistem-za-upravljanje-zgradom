import { Component, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { Paginacija } from '../../../shared/paginacija/paginacija';
import { StanjeNavigacije } from '../../../shared/poruka';
import { injectZgradeKorisnika } from '../../zgrade/zgrade-korisnika';
import { Glasanje, StanjeGlasanja } from '../glasanje-models';
import { ListaGlasanjaStore } from '../lista-glasanja-store';
import { KarticaGlasanja } from '../kartica-glasanja/kartica-glasanja';

@Component({
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    MessageModule,
    SelectModule,
    SelectButtonModule,
    SkeletonModule,
    Paginacija,
    KarticaGlasanja,
  ],
  providers: [ListaGlasanjaStore, ConfirmationService],
  selector: 'app-lista-glasanja',
  styleUrl: './lista-glasanja.scss',
  templateUrl: './lista-glasanja.html',
})
export class ListaGlasanja {
  protected readonly store = inject(ListaGlasanjaStore);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  private readonly fokusiraj = fokusPosleCrtanja();

  protected readonly filteri: { label: string; value: StanjeGlasanja }[] = [
    { label: 'Aktivne', value: 'aktivna' },
    { label: 'Završene', value: 'zavrsena' },
  ];

  private readonly zgradeKorisnika = injectZgradeKorisnika();
  protected readonly zgrade = this.zgradeKorisnika.zgrade;
  protected readonly opcijeZgrada = computed(() => [
    { id: null, naziv: 'Sve zgrade' },
    ...this.zgrade(),
  ]);
  protected readonly bezZgrade = computed(
    () =>
      this.zgradeKorisnika.profil.hasValue() &&
      !this.zgradeKorisnika.admin() &&
      this.zgrade().length === 0,
  );
  // Glasanje pravi upravnik (zgrada u profilu je samo zgrada kojom upravlja) i admin
  protected readonly praviGlasanja = computed(() => {
    const profil = this.zgradeKorisnika.profil;
    return profil.hasValue() && (profil.value().uloga === 'admin' || !!profil.value().zgrada);
  });

  constructor() {
    const navigacija = this.router.currentNavigation();
    const stanje = navigacija?.extras.state as StanjeNavigacije | undefined;
    if (navigacija?.trigger === 'imperative' && stanje?.poruka) {
      this.store.prikaziPoruku(stanje.poruka);
      // Raspored posle navigacije fokusira sadržaj, pa poruku fokusiramo tek kad se lista učita
      const cekaListu = effect(() => {
        if (this.store.isFulfilled()) {
          this.fokusiraj('#poruka-glasanja');
          cekaListu.destroy();
        }
      });
    }
  }

  protected async glasaj(glasanje: Glasanje, opcijaId: number): Promise<void> {
    if (!(await this.store.glasaj(glasanje, opcijaId))) {
      this.fokusiraj('#poruka-glasanja');
    }
  }

  protected async povuci(glasanje: Glasanje): Promise<void> {
    // Dugme Povuci glas nestaje, pa fokus ide na prvu opciju
    const fokus = (await this.store.povuciGlas(glasanje))
      ? `#anketa-${glasanje.id} .opcija`
      : '#poruka-glasanja';
    this.fokusiraj(fokus);
  }

  protected zatvori(event: Event, glasanje: Glasanje): void {
    this.potvrdi(event, {
      header: 'Zatvaranje ankete',
      message: `Zatvoriti anketu „${glasanje.pitanje}“ pre roka? Glasanje se završava odmah, a rezultate vide svi stanari.`,
      natpis: 'Zatvori',
      akcija: () => this.store.zatvori(glasanje.id),
    });
  }

  protected obrisi(event: Event, glasanje: Glasanje): void {
    const odluka = glasanje.vrsta === 'odluka';
    this.potvrdi(event, {
      header: odluka ? 'Brisanje odluke' : 'Brisanje ankete',
      message: `Obrisati ${odluka ? 'odluku' : 'anketu'} „${glasanje.pitanje}“ i sve glasove? Ovo ne može da se poništi.`,
      natpis: 'Obriši',
      akcija: () => this.store.obrisi(glasanje),
    });
  }

  private potvrdi(
    event: Event,
    podaci: { header: string; message: string; natpis: string; akcija: () => Promise<boolean> },
  ): void {
    const dugme = event.currentTarget as HTMLElement;
    this.confirmationService.confirm({
      header: podaci.header,
      message: podaci.message,
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: podaci.natpis, severity: 'danger' },
      accept: async () => {
        await podaci.akcija();
        this.fokusiraj('#poruka-glasanja');
      },
      reject: () => dugme.focus(),
    });
  }
}
