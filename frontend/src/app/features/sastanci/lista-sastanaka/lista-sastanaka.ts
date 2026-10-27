import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { Paginacija } from '../../../shared/paginacija/paginacija';
import { injectZgradeKorisnika } from '../../zgrade/zgrade-korisnika';
import { StanjeSastanka } from '../sastanak-models';
import { OznakeSastanka } from '../oznake-sastanka/oznake-sastanka';
import { ListaSastanakaStore } from '../lista-sastanaka-store';
import { kadaJe, poMesecima, tacaka } from '../pravila-sastanka';

@Component({
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    MessageModule,
    SelectModule,
    SelectButtonModule,
    SkeletonModule,
    Paginacija,
    OznakeSastanka,
  ],
  providers: [ListaSastanakaStore],
  selector: 'app-lista-sastanaka',
  styleUrl: './lista-sastanaka.scss',
  templateUrl: './lista-sastanaka.html',
})
export class ListaSastanaka {
  protected readonly store = inject(ListaSastanakaStore);

  protected readonly filteri: { label: string; value: StanjeSastanka }[] = [
    { label: 'Predstojeći', value: 'predstojeci' },
    { label: 'Održani', value: 'odrzani' },
  ];

  protected readonly kadaJe = kadaJe;
  protected readonly tacaka = tacaka;

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
  // Sastanak zakazuje upravnik (zgrada u profilu je samo zgrada kojom upravlja) i admin
  protected readonly zakazuje = computed(() => {
    const profil = this.zgradeKorisnika.profil;
    return profil.hasValue() && (profil.value().uloga === 'admin' || !!profil.value().zgrada);
  });

  // Najbliži sastanak koji nije otkazan ističe se na vrhu prve strane predstojećih
  protected readonly sledeci = computed(() =>
    this.store.stanje() === 'predstojeci' && this.store.strana() === 1
      ? (this.store.sastanci().find((s) => !s.otkazan) ?? null)
      : null,
  );
  protected readonly ostali = computed(() =>
    this.store.sastanci().filter((s) => s !== this.sledeci()),
  );
  protected readonly meseci = computed(() => poMesecima(this.ostali()));
}
