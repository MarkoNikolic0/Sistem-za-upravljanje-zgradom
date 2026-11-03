import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { oblik, uMnozini } from '../../../shared/mnozina';
import { Poruka, StanjeNavigacije } from '../../../shared/poruka';
import { FormaZgrade } from '../forma-zgrade/forma-zgrade';
import { ZgradaOsnovno } from '../zgrada-models';
import { ZgradaService } from '../zgrada-service';

@Component({
  imports: [DatePipe, RouterLink, ButtonModule, MessageModule, SkeletonModule, FormaZgrade],
  selector: 'app-lista-zgrada',
  templateUrl: './lista-zgrada.html',
  styleUrl: './lista-zgrada.scss',
})
export class ListaZgrada {
  private zgradaService = inject(ZgradaService);
  private router = inject(Router);
  private readonly fokusiraj = fokusPosleCrtanja();

  protected readonly zgrade = this.zgradaService.zgradeSaBrojevima();
  protected readonly nova = signal(false);
  protected readonly poruka = signal<Poruka | null>(null);
  protected readonly vracanje = signal<number | null>(null);

  protected readonly aktivne = computed(() =>
    this.zgrade.hasValue() ? this.zgrade.value().filter((z) => z.arhivirana === null) : [],
  );
  protected readonly arhivirane = computed(() =>
    this.zgrade.hasValue() ? this.zgrade.value().filter((z) => z.arhivirana !== null) : [],
  );

  protected readonly zbir = computed(() => {
    const zgrade = this.aktivne();
    if (zgrade.length === 0) {
      return '';
    }
    const stanovi = zgrade.reduce((zbir, z) => zbir + z.brojStanova, 0);
    const stanari = zgrade.reduce((zbir, z) => zbir + z.brojStanara, 0);
    return [
      uMnozini(zgrade.length, 'zgrada', 'zgrade', 'zgrada'),
      uMnozini(stanovi, 'stan', 'stana', 'stanova'),
      uMnozini(stanari, 'stanar', 'stanara', 'stanara'),
    ].join(' · ');
  });

  protected readonly uMnozini = uMnozini;
  protected readonly oblik = oblik;

  constructor() {
    const navigacija = this.router.currentNavigation();
    const stanje = navigacija?.extras.state as StanjeNavigacije | undefined;
    if (navigacija?.trigger === 'imperative' && stanje?.poruka) {
      this.poruka.set(stanje.poruka);
    }
  }

  protected otvori(): void {
    this.poruka.set(null);
    this.nova.set(true);
  }

  protected zatvori(): void {
    this.nova.set(false);
    this.fokusiraj('#nova-zgrada');
  }

  protected async vrati(zgrada: ZgradaOsnovno): Promise<void> {
    this.poruka.set(null);
    this.vracanje.set(zgrada.id);
    try {
      await firstValueFrom(this.zgradaService.vratiIzArhive(zgrada.id));
      this.poruka.set({
        tip: 'uspeh',
        tekst: `Zgrada „${zgrada.naziv}“ je vraćena, bez stanara i upravnika. Postavi upravnika, a stanari šalju nove zahteve.`,
      });
    } catch (err) {
      this.poruka.set({
        tip: 'greska',
        tekst:
          err instanceof HttpErrorResponse && err.status === 404
            ? `Zgrada „${zgrada.naziv}“ je u međuvremenu obrisana.`
            : 'Zgrada nije vraćena. Pokušaj ponovo.',
      });
    } finally {
      this.vracanje.set(null);
      this.zgrade.reload();
      this.fokusiraj('#poruka-zgrada');
    }
  }

  protected dodata(zgrada: ZgradaOsnovno): void {
    const stanje: StanjeNavigacije = {
      poruka: {
        tip: 'uspeh',
        tekst: `Zgrada „${zgrada.naziv}“ je dodata. Sada dodaj stanove i postavi upravnika.`,
      },
    };
    void this.router.navigate(['/zgrade', zgrada.id], { state: stanje });
  }
}
