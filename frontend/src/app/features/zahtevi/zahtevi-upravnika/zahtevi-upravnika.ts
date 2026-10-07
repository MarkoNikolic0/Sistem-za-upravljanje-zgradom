import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { formatirajTelefon } from '../../../shared/telefon';
import { SpratPipe } from '../../../shared/sprat-pipe';
import { FilterZahteva, NAZIVI_STATUSA_ZAHTEVA, ZahtevUpravnika } from '../zahtev-models';
import { ZAHTEVA_PO_STRANI, ZahteviStore } from '../zahtev-store';

@Component({
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    MessageModule,
    PaginatorModule,
    SelectButtonModule,
    SkeletonModule,
    SpratPipe,
  ],
  providers: [ZahteviStore, ConfirmationService],
  selector: 'app-zahtevi-upravnika',
  styleUrl: './zahtevi-upravnika.scss',
  templateUrl: './zahtevi-upravnika.html',
})
export class ZahteviUpravnika {
  protected readonly store = inject(ZahteviStore);
  private confirmationService = inject(ConfirmationService);

  protected readonly poStrani = ZAHTEVA_PO_STRANI;
  protected readonly naziviStatusa = NAZIVI_STATUSA_ZAHTEVA;
  protected readonly formatirajTelefon = formatirajTelefon;

  protected readonly filteri: { label: string; value: FilterZahteva }[] = [
    { label: 'Na čekanju', value: 'na_cekanju' },
    { label: 'Svi', value: 'svi' },
  ];

  protected promeniStranu(event: PaginatorState): void {
    this.store.promeniStranu((event.page ?? 0) + 1);
  }

  protected prihvatiKaoVlasnika(event: Event, zahtev: ZahtevUpravnika): void {
    const dugme = event.currentTarget as HTMLElement;
    this.confirmationService.confirm({
      header: 'Prihvatanje kao vlasnika',
      message: `Prihvatiti kao vlasnika: ${zahtev.korisnik.ime} ${zahtev.korisnik.prezime}, stan ${zahtev.stan.broj}? Vlasnik ima pravo glasa u skupštini zgrade.`,
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Prihvati' },
      accept: () => this.store.prihvati(zahtev, true),
      // PrimeNG ne vraća fokus posle zatvaranja
      reject: () => dugme.focus(),
    });
  }

  protected odbij(event: Event, zahtev: ZahtevUpravnika): void {
    const dugme = event.currentTarget as HTMLElement;
    this.confirmationService.confirm({
      header: 'Odbijanje zahteva',
      message: `Odbiti zahtev: ${zahtev.korisnik.ime} ${zahtev.korisnik.prezime}, stan ${zahtev.stan.broj}? Stanar će morati da pošalje novi zahtev.`,
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Odbij', severity: 'danger' },
      accept: () => this.store.odbij(zahtev),
      reject: () => dugme.focus(),
    });
  }
}
