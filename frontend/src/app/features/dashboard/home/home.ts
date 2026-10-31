import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { ProfileService } from '../../profile/profile-service';
import { ZahtevService } from '../../zahtevi/zahtev-service';
import { DatePipe } from '@angular/common';
import { PregledZgrada } from '../pregled-zgrada/pregled-zgrada';
import { Danas } from '../danas/danas';
import { VazniKontakti } from '../../kontakti/vazni-kontakti/vazni-kontakti';
import { zgradeIzProfila } from '../../zgrade/zgrade-korisnika';

// Prvi korak za stanara koji jos nema stan
type PrviKorak = 'povezi' | 'ceka' | 'odbijen';

@Component({
  imports: [
    DatePipe,
    RouterLink,
    ButtonModule,
    MessageModule,
    SkeletonModule,
    PregledZgrada,
    Danas,
    VazniKontakti,
  ],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  private profileService = inject(ProfileService);
  private zahtevService = inject(ZahtevService);

  protected readonly profil = this.profileService.profile();
  protected readonly zahtevi = this.zahtevService.mojiZahtevi();
  protected readonly danas = new Date();

  protected readonly zgrade = computed(() =>
    this.profil.hasValue() ? zgradeIzProfila(this.profil.value()) : [],
  );

  protected readonly zahteviStigli = computed(
    () => this.zahtevi.hasValue() && !this.zahtevi.isLoading(),
  );

  protected readonly zahtevNaCekanju = computed(() =>
    this.zahtevi.hasValue()
      ? this.zahtevi.value().find((zahtev) => zahtev.status === 'na_cekanju')
      : undefined,
  );

  protected readonly odbijenZahtev = computed(() => {
    const poslednji = this.zahtevi.hasValue() ? this.zahtevi.value()[0] : undefined;
    return poslednji?.status === 'odbijen' ? poslednji : undefined;
  });

  protected readonly prviKorak = computed((): PrviKorak | null => {
    if (!this.profil.hasValue()) {
      return null;
    }
    const profil = this.profil.value();
    if (profil.uloga !== 'stanar' || profil.stanovi.length > 0) {
      return null;
    }
    if (this.zahtevNaCekanju()) {
      return 'ceka';
    }
    return this.odbijenZahtev() ? 'odbijen' : 'povezi';
  });

  protected ponovo(): void {
    this.profil.reload();
    this.zahtevi.reload();
  }
}
