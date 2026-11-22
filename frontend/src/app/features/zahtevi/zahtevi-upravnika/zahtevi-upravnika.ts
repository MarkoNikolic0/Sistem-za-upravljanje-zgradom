import { afterRenderEffect, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { FormaRazloga } from '../../../shared/forme/forma-razloga/forma-razloga';
import { formatirajTelefon } from '../../../shared/tekst/telefon';
import { SpratPipe } from '../../../shared/spratovi/sprat-pipe';
import {
  BOJE_STATUSA_ZAHTEVA,
  FilterZahteva,
  NAZIVI_STATUSA_ZAHTEVA,
  ZahtevUpravnika,
} from '../zahtev-models';
import { ZahteviStore } from '../zahtev-store';
import { TagModule } from 'primeng/tag';
import { Paginacija } from '../../../shared/liste/paginacija/paginacija';
import { dugmadPotvrde } from '../../../shared/dugmad-potvrde';
import { osveziNaNotifikaciju } from '../../notifikacije/osvezi-na-notifikaciju';
import { PokusajPonovo } from '../../../shared/pokusaj-ponovo';

@Component({
  imports: [
    PokusajPonovo,
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    MessageModule,
    SelectButtonModule,
    SkeletonModule,
    TagModule,
    SpratPipe,
    Paginacija,
    FormaRazloga,
  ],
  providers: [ZahteviStore, ConfirmationService],
  selector: 'app-zahtevi-upravnika',
  styleUrl: './zahtevi-upravnika.scss',
  templateUrl: './zahtevi-upravnika.html',
})
export class ZahteviUpravnika {
  protected readonly store = inject(ZahteviStore);
  private confirmationService = inject(ConfirmationService);
  private readonly porukaObrade = viewChild.required<ElementRef<HTMLElement>>('porukaObrade');
  private readonly fokusiraj = fokusPosleCrtanja();

  protected readonly odbijanjeId = signal<number | null>(null);

  protected readonly naziviStatusa = NAZIVI_STATUSA_ZAHTEVA;
  protected readonly bojeStatusa = BOJE_STATUSA_ZAHTEVA;
  protected readonly formatirajTelefon = formatirajTelefon;

  protected readonly filteri: { label: string; value: FilterZahteva }[] = [
    { label: 'Na čekanju', value: 'na_cekanju' },
    { label: 'Svi', value: 'svi' },
  ];

  constructor() {
    osveziNaNotifikaciju(
      ({ link }) => link === '/zahtevi',
      () => this.store.ucitaj(),
    );
    afterRenderEffect(() => {
      if (this.store.poruka()) {
        this.porukaObrade().nativeElement.focus();
      }
    });
  }

  protected prihvatiKaoVlasnika(event: Event, zahtev: ZahtevUpravnika): void {
    const dugme = event.currentTarget as HTMLElement;
    this.confirmationService.confirm({
      header: 'Prihvatanje kao vlasnika',
      message: `Prihvatiti kao vlasnika: ${zahtev.korisnik.ime} ${zahtev.korisnik.prezime}, stan ${zahtev.stan.broj}? Vlasnik ima pravo glasa u skupštini zgrade.`,
      ...dugmadPotvrde('Prihvati'),
      accept: () => this.store.prihvati(zahtev, true),
      // PrimeNG ne vraća fokus posle zatvaranja
      reject: () => dugme.focus(),
    });
  }

  protected otvoriOdbijanje(zahtev: ZahtevUpravnika): void {
    this.odbijanjeId.set(zahtev.id);
  }

  protected odbij(zahtev: ZahtevUpravnika, razlog: string): void {
    this.odbijanjeId.set(null);
    this.store.odbij(zahtev, razlog);
  }

  protected odustaniOdOdbijanja(zahtev: ZahtevUpravnika): void {
    this.odbijanjeId.set(null);
    this.fokusiraj(`#odbij-${zahtev.id}`);
  }
}
