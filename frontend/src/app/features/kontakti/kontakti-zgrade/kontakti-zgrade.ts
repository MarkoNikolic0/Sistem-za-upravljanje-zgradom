import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { Poruka } from '../../../shared/poruka';
import { AkcijeStore } from '../../../shared/with-akcije';
import { KontaktRequest, KontaktZgrade } from '../kontakt-models';
import { KontaktService } from '../kontakt-service';
import { FormaKontakta } from '../forma-kontakta/forma-kontakta';
import { RedKontakta } from '../red-kontakta/red-kontakta';
import { injectZgradeUpravnika } from '../../zgrade/zgrade-korisnika';

@Component({
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
    FormaKontakta,
    RedKontakta,
  ],
  providers: [ConfirmationService, AkcijeStore],
  selector: 'app-kontakti-zgrade',
  templateUrl: './kontakti-zgrade.html',
  styleUrl: './kontakti-zgrade.scss',
})
export class KontaktiZgrade {
  private kontaktService = inject(KontaktService);
  private confirmationService = inject(ConfirmationService);
  protected readonly akcije = inject(AkcijeStore);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly zgrada = input(undefined, { transform: numberAttribute });

  private readonly izbor = injectZgradeUpravnika();
  protected readonly profil = this.izbor.profil;
  protected readonly admin = this.izbor.admin;
  protected readonly zgrade = this.izbor.zgrade;
  protected readonly ucitano = this.izbor.ucitano;
  protected readonly greska = this.izbor.greska;

  protected readonly zgradaId = linkedSignal<number | null>(() => {
    const zgrade = this.zgrade();
    return (zgrade.find((z) => z.id === this.zgrada()) ?? zgrade[0])?.id ?? null;
  });
  protected readonly kontakti = this.kontaktService.kontakti(this.zgradaId);

  protected readonly ja = computed((): KontaktRequest | undefined => {
    if (!this.profil.hasValue() || this.profil.value().uloga !== 'upravnik') {
      return undefined;
    }
    const { ime, prezime, telefon } = this.profil.value();
    const vecJe =
      this.kontakti.hasValue() && this.kontakti.value().some((k) => k.telefon === telefon);
    return vecJe ? undefined : { naziv: `${ime} ${prezime}`, uloga: 'Upravnik zgrade', telefon };
  });

  protected readonly forma = signal<'novi' | number | null>(null);

  protected promeniZgradu(id: number): void {
    this.zgradaId.set(id);
    this.forma.set(null);
    this.akcije.ponisti();
  }

  protected otvori(forma: 'novi' | number): void {
    this.forma.set(forma);
    this.akcije.ponisti();
  }

  protected zatvori(): void {
    const forma = this.forma();
    this.forma.set(null);
    this.fokusiraj(forma === 'novi' ? '#dodaj-kontakt' : `#izmeni-${forma}`);
  }

  protected sacuvan(kontakt: KontaktZgrade): void {
    const novi = this.forma() === 'novi';
    this.forma.set(null);
    this.kontakti.reload();
    this.prikazi({
      tip: 'uspeh',
      tekst: novi
        ? `Dodat je kontakt „${kontakt.naziv}“.`
        : `Kontakt „${kontakt.naziv}“ je izmenjen.`,
    });
  }

  protected zastarelo(tekst: string): void {
    this.forma.set(null);
    this.kontakti.reload();
    this.prikazi({ tip: 'greska', tekst });
  }

  protected obrisi(event: Event, kontakt: KontaktZgrade): void {
    const dugme = event.currentTarget as HTMLElement;
    const zgradaId = this.zgradaId();
    if (zgradaId === null) {
      return;
    }
    this.confirmationService.confirm({
      header: 'Brisanje kontakta',
      message: `Obrisati kontakt „${kontakt.naziv}“? Stanari ga više neće videti na početnoj.`,
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Obriši', severity: 'danger' },
      accept: async () => {
        const osvezi = () => this.kontakti.reload();
        await this.akcije.izvrsi(
          async () => {
            await firstValueFrom(this.kontaktService.obrisi(zgradaId, kontakt.id));
            osvezi();
          },
          `Kontakt „${kontakt.naziv}“ je obrisan.`,
          'Kontakt nije obrisan. Pokušaj ponovo.',
          osvezi,
          // Već obrisan (drugi tab, drugi upravnik): cilj je postignut
          { tip: 'uspeh', tekst: `Kontakt „${kontakt.naziv}“ je već obrisan.` },
        );
        if (this.akcije.poruka()) {
          this.fokusiraj('#poruka-kontakata');
        }
      },
      reject: () => dugme.focus(),
    });
  }

  private prikazi(poruka: Poruka): void {
    this.akcije.prikaziPoruku(poruka);
    this.fokusiraj('#poruka-kontakata');
  }
}
