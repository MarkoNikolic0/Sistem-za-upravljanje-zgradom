import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { FormaRazloga } from '../../../shared/forma-razloga/forma-razloga';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { porukaServera } from '../../../shared/greske-servera';
import { idIzAdrese, jeIspravanId } from '../../../shared/ispravan-id';
import { Poruka, StanjeNavigacije } from '../../../shared/poruka';
import { formatRoka } from '../../../shared/datum';
import { StanjeOdluke } from '../../glasanje/stanje-odluke/stanje-odluke';
import { VECINE_ODLUKE } from '../../glasanje/glasanje-models';
import { OznakeSastanka } from '../oznake-sastanka/oznake-sastanka';
import { SastanakService } from '../sastanak-service';
import { kadaJe } from '../pravila-sastanka';

@Component({
  imports: [
    DatePipe,
    RouterLink,
    ButtonModule,
    MessageModule,
    SkeletonModule,
    FormaRazloga,
    StanjeOdluke,
    OznakeSastanka,
  ],
  selector: 'app-detalj-sastanka',
  styleUrl: './detalj-sastanka.scss',
  templateUrl: './detalj-sastanka.html',
})
export class DetaljSastanka {
  private sastanakService = inject(SastanakService);
  private router = inject(Router);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly id = input(undefined, { transform: idIzAdrese });
  protected readonly neispravanId = computed(() => {
    const id = this.id();
    return id === undefined || !jeIspravanId(id);
  });
  protected readonly sastanak = this.sastanakService.sastanak(
    computed(() => (this.neispravanId() ? undefined : this.id())),
  );

  protected readonly vecine = VECINE_ODLUKE;
  protected readonly kadaJe = kadaJe;
  protected readonly formatRoka = formatRoka;

  protected readonly poruka = signal<Poruka | null>(null);
  protected readonly otkazivanje = signal(false);
  protected readonly slanje = signal(false);

  constructor() {
    const navigacija = this.router.currentNavigation();
    const stanje = navigacija?.extras.state as StanjeNavigacije | undefined;
    if (navigacija?.trigger === 'imperative' && stanje?.poruka) {
      this.poruka.set(stanje.poruka);
    }
  }

  protected zapocniOtkazivanje(): void {
    this.poruka.set(null);
    this.otkazivanje.set(true);
  }

  protected odustani(): void {
    this.otkazivanje.set(false);
    this.fokusiraj('#otkazi-sastanak');
  }

  protected async otkazi(razlog: string): Promise<void> {
    if (!this.sastanak.hasValue()) {
      return;
    }
    this.slanje.set(true);
    try {
      const sastanak = await firstValueFrom(
        this.sastanakService.otkazi(this.sastanak.value().id, razlog),
      );
      this.sastanak.set(sastanak);
      this.otkazivanje.set(false);
      this.poruka.set({ tip: 'uspeh', tekst: 'Otkazivanje je sačuvano. Pozvani vide razlog.' });
    } catch (err) {
      const greska = err instanceof HttpErrorResponse ? err : null;
      this.poruka.set({
        tip: 'greska',
        tekst: (greska && porukaServera(greska)) ?? 'Sastanak nije otkazan. Pokušaj ponovo.',
      });
      if (greska?.status === 404 || greska?.status === 409) {
        this.otkazivanje.set(false);
        this.sastanak.reload();
      }
    } finally {
      this.slanje.set(false);
      this.fokusiraj('#poruka-sastanka');
    }
  }
}
