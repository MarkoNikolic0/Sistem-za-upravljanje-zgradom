import { Component, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { porukaServera } from '../../../shared/forme/greske-servera';
import { idIzAdrese, jeIspravanId } from '../../../shared/ispravan-id';
import { Poruka, StanjeNavigacije } from '../../../shared/stanje/poruka';
import { FormaZgrade } from '../forma-zgrade/forma-zgrade';
import { StanoviZgrade } from '../stanovi-zgrade/stanovi-zgrade';
import { UpravnikZgrade } from '../upravnik-zgrade/upravnik-zgrade';
import { ZgradaOsnovno } from '../zgrada-models';
import { ZgradaService } from '../zgrada-service';

@Component({
  imports: [
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    MessageModule,
    SkeletonModule,
    FormaZgrade,
    StanoviZgrade,
    UpravnikZgrade,
  ],
  providers: [ConfirmationService],
  selector: 'app-detalj-zgrade',
  templateUrl: './detalj-zgrade.html',
  styleUrl: './detalj-zgrade.scss',
})
export class DetaljZgrade {
  private zgradaService = inject(ZgradaService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly id = input(undefined, { transform: idIzAdrese });
  protected readonly zgradaId = computed(() => {
    const id = this.id();
    return id !== undefined && jeIspravanId(id) ? id : undefined;
  });
  protected readonly zgrada = this.zgradaService.zgrada(this.zgradaId);
  protected readonly nePostoji = computed(() => {
    const greska = this.zgrada.error();
    return (
      this.zgradaId() === undefined ||
      (greska instanceof HttpErrorResponse && greska.status === 404)
    );
  });

  protected readonly izmena = signal(false);
  protected readonly brisanje = signal(false);
  protected readonly arhiviranje = signal(false);
  protected readonly poruka = signal<Poruka | null>(null);

  constructor() {
    const navigacija = this.router.currentNavigation();
    const stanje = navigacija?.extras.state as StanjeNavigacije | undefined;
    if (navigacija?.trigger === 'imperative' && stanje?.poruka) {
      this.poruka.set(stanje.poruka);
    }
  }

  protected otvoriIzmenu(): void {
    this.poruka.set(null);
    this.izmena.set(true);
  }

  protected zatvoriIzmenu(): void {
    this.izmena.set(false);
    this.fokusiraj('#izmeni-zgradu');
  }

  protected sacuvana(zgrada: ZgradaOsnovno): void {
    this.zgrada.set(zgrada);
    this.izmena.set(false);
    this.prikazi({ tip: 'uspeh', tekst: 'Podaci o zgradi su sačuvani.' });
  }

  protected obrisana(): void {
    this.naListu(`Zgrada je u međuvremenu obrisana.`);
  }

  protected obrisi(event: Event, zgrada: ZgradaOsnovno): void {
    const dugme = event.currentTarget as HTMLElement;
    this.poruka.set(null);
    this.confirmationService.confirm({
      header: 'Brisanje zgrade',
      message: `Obrisati zgradu „${zgrada.naziv}“? Briše se samo zgrada bez stanova, upravnika i istorije (kvarova, oglasa, glasanja, sastanaka). Zgradu sa podacima arhiviraj.`,
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Obriši', severity: 'danger' },
      accept: async () => {
        this.brisanje.set(true);
        try {
          await firstValueFrom(this.zgradaService.obrisi(zgrada.id));
          this.naListu(`Zgrada „${zgrada.naziv}“ je obrisana.`);
        } catch (err) {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            this.naListu(`Zgrada „${zgrada.naziv}“ je već obrisana.`);
            return;
          }
          const tekst =
            err instanceof HttpErrorResponse && err.status === 409
              ? `${porukaServera(err) ?? 'Zgrada ima podatke.'} Umesto brisanja možeš da je arhiviraš.`
              : 'Zgrada nije obrisana. Pokušaj ponovo.';
          this.prikazi({ tip: 'greska', tekst });
        } finally {
          this.brisanje.set(false);
        }
      },
      reject: () => dugme.focus(),
    });
  }

  protected arhiviraj(event: Event, zgrada: ZgradaOsnovno): void {
    const dugme = event.currentTarget as HTMLElement;
    this.poruka.set(null);
    this.confirmationService.confirm({
      header: 'Arhiviranje zgrade',
      message: `Zgrada „${zgrada.naziv}“ nestaje iz aplikacije za sve. Stanari se odseljavaju, upravnik se vraća u stanara, zahtevi na čekanju se odbijaju, a oglasi se sakrivaju. Stanovi, kvarovi, obaveštenja, glasanja i sastanci ostaju sačuvani i vraćaju se kad vratiš zgradu.`,
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Arhiviraj', severity: 'danger' },
      accept: async () => {
        this.arhiviranje.set(true);
        try {
          await firstValueFrom(this.zgradaService.arhiviraj(zgrada.id));
          this.naListu(`Zgrada „${zgrada.naziv}“ je arhivirana.`);
        } catch (err) {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            this.naListu(`Zgrada „${zgrada.naziv}“ je u međuvremenu obrisana.`);
            return;
          }
          this.prikazi({ tip: 'greska', tekst: 'Zgrada nije arhivirana. Pokušaj ponovo.' });
        } finally {
          this.arhiviranje.set(false);
        }
      },
      reject: () => dugme.focus(),
    });
  }

  private naListu(tekst: string): void {
    const stanje: StanjeNavigacije = { poruka: { tip: 'uspeh', tekst } };
    void this.router.navigate(['/zgrade'], { state: stanje });
  }

  private prikazi(poruka: Poruka): void {
    this.poruka.set(poruka);
    this.fokusiraj('#poruka-zgrade');
  }
}
