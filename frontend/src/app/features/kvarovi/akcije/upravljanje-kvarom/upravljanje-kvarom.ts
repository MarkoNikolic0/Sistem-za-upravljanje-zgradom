import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import {
  DANA_ZA_RESAVANJE,
  KvarDetalj,
  NAZIVI_PRIORITETA_KVARA,
  PrioritetKvara,
} from '../../kvar-models';
import { KvarService } from '../../kvar-service';
import { DetaljKvaraStore } from '../../detalj-kvara-store';
import { RazlogPromene } from '../../status/razlog-promene/razlog-promene';
import { fokusPosleCrtanja } from '../../../../shared/fokus';
import { FormaRazloga } from '../../../../shared/forma-razloga/forma-razloga';

@Component({
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    SelectModule,
    SelectButtonModule,
    RazlogPromene,
    FormaRazloga,
  ],
  providers: [ConfirmationService],
  selector: 'app-upravljanje-kvarom',
  styleUrl: './upravljanje-kvarom.scss',
  templateUrl: './upravljanje-kvarom.html',
})
export class UpravljanjeKvarom {
  protected readonly store = inject(DetaljKvaraStore);
  private kvarService = inject(KvarService);
  private confirmationService = inject(ConfirmationService);

  private readonly fokusiraj = fokusPosleCrtanja();

  readonly kvar = input.required<KvarDetalj>();

  protected readonly prioriteti: { label: string; value: PrioritetKvara }[] = [
    { label: NAZIVI_PRIORITETA_KVARA.nisko, value: 'nisko' },
    { label: NAZIVI_PRIORITETA_KVARA.srednje, value: 'srednje' },
    { label: NAZIVI_PRIORITETA_KVARA.hitno, value: 'hitno' },
  ];

  protected readonly odbijanjeOtvoreno = linkedSignal({
    source: () => this.kvar().status,
    computation: () => false,
  });

  protected readonly dana = DANA_ZA_RESAVANJE;

  private readonly kategorijaZaDodelu = computed(() => {
    const kvar = this.kvar();
    return kvar.status === 'prihvacen' || kvar.status === 'dodeljen' ? kvar.kategorija : undefined;
  });
  protected readonly serviseri = this.kvarService.serviseri(this.kategorijaZaDodelu);
  protected readonly opcijeServisera = computed(() =>
    this.serviseri.value().map((s) => ({ id: s.id, naziv: `${s.ime} ${s.prezime}` })),
  );
  protected readonly izabraniServiser = linkedSignal(() => this.kvar().serviser?.id ?? null);
  protected readonly prioritet = linkedSignal(() => this.kvar().prioritet);

  protected mozeDaDodeli(): boolean {
    const izabran = this.izabraniServiser();
    return izabran !== null && izabran !== this.kvar().serviser?.id && !this.store.akcijaUToku();
  }

  protected dodeli(): void {
    const izabran = this.izabraniServiser();
    if (izabran !== null) {
      this.store.dodeliServisera(izabran);
    }
  }

  protected promeniPrioritet(prioritet: PrioritetKvara): void {
    this.prioritet.set(prioritet);
    this.store.postaviPrioritet(prioritet);
  }

  protected prebaciOdbijanje(): void {
    this.odbijanjeOtvoreno.update((otvoreno) => !otvoreno);
  }

  protected odustaniOdbijanje(): void {
    this.odbijanjeOtvoreno.set(false);
    this.fokusiraj('#odbij');
  }

  protected zatvori(event: Event): void {
    const dugme = event.currentTarget as HTMLElement;
    this.confirmationService.confirm({
      header: 'Zatvaranje kvara',
      message: 'Zatvoriti kvar? Kvar prelazi u završene i više ne može da se menja.',
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Zatvori kvar' },
      accept: () => this.store.zatvori(),
      reject: () => dugme.focus(),
    });
  }
}
