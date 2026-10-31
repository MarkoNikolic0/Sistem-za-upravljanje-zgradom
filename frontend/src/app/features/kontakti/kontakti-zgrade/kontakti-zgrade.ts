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
import { firstValueFrom } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { Poruka } from '../../../shared/poruka';
import { ProfileService } from '../../profile/profile-service';
import { ZgradaService } from '../../zgrade/zgrada-service';
import { KontaktRequest, KontaktZgrade } from '../kontakt-models';
import { KontaktService } from '../kontakt-service';
import { FormaKontakta } from '../forma-kontakta/forma-kontakta';
import { RedKontakta } from '../red-kontakta/red-kontakta';

const MAKS_KONTAKATA = 20;

@Component({
  imports: [
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
    FormaKontakta,
    RedKontakta,
  ],
  providers: [ConfirmationService],
  selector: 'app-kontakti-zgrade',
  templateUrl: './kontakti-zgrade.html',
  styleUrl: './kontakti-zgrade.scss',
})
export class KontaktiZgrade {
  private kontaktService = inject(KontaktService);
  private confirmationService = inject(ConfirmationService);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly zgrada = input(undefined, { transform: numberAttribute });

  protected readonly profil = inject(ProfileService).profile();
  protected readonly admin = computed(
    () => this.profil.hasValue() && this.profil.value().uloga === 'admin',
  );
  protected readonly sveZgrade = inject(ZgradaService).zgrade(this.admin);

  protected readonly zgrade = computed(() => {
    if (!this.profil.hasValue()) {
      return [];
    }
    if (this.admin()) {
      return this.sveZgrade.value();
    }
    const zgrada = this.profil.value().zgrada;
    return zgrada ? [zgrada] : [];
  });
  protected readonly ucitano = computed(
    () => this.profil.hasValue() && (!this.admin() || this.sveZgrade.status() === 'resolved'),
  );

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

  protected readonly popunjeno = computed(
    () => this.kontakti.hasValue() && this.kontakti.value().length >= MAKS_KONTAKATA,
  );
  protected readonly maksKontakata = MAKS_KONTAKATA;

  protected readonly forma = signal<'novi' | number | null>(null);
  protected readonly poruka = signal<Poruka | null>(null);
  protected readonly brisanje = signal(false);

  protected promeniZgradu(id: number): void {
    this.zgradaId.set(id);
    this.forma.set(null);
    this.poruka.set(null);
  }

  protected otvori(forma: 'novi' | number): void {
    this.forma.set(forma);
    this.poruka.set(null);
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
        this.brisanje.set(true);
        try {
          await firstValueFrom(this.kontaktService.obrisi(zgradaId, kontakt.id));
          this.prikazi({ tip: 'uspeh', tekst: `Kontakt „${kontakt.naziv}“ je obrisan.` });
        } catch {
          this.prikazi({ tip: 'greska', tekst: 'Kontakt nije obrisan. Pokušaj ponovo.' });
        } finally {
          this.brisanje.set(false);
          this.kontakti.reload();
        }
      },
      reject: () => dugme.focus(),
    });
  }

  private prikazi(poruka: Poruka): void {
    this.poruka.set(poruka);
    this.fokusiraj('#poruka-kontakata');
  }
}
