import {
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { AkcijeStore } from '../../../shared/stanje/with-akcije';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { poSpratovima } from '../../../shared/spratovi/spratovi';
import { SpratPipe } from '../../../shared/spratovi/sprat-pipe';
import { stanova } from '../../glasanje/pravila-glasanja';
import { PregledPrisustva, SpisakPrisustva, StanNaSpisku } from '../sastanak-models';
import { SastanakService } from '../sastanak-service';

function najavioDolazak(stan: StanNaSpisku): boolean {
  return stan.stanari.some((st) => st.dolazi === true);
}

function prisutniPoNajavi(spisak: SpisakPrisustva): Set<number> {
  return new Set(
    spisak.stanovi
      .filter((s) => (spisak.datumEvidencije === null ? najavioDolazak(s) : s.prisutan))
      .map((s) => s.id),
  );
}

@Component({
  imports: [DatePipe, ButtonModule, MessageModule, SkeletonModule, SpratPipe],
  providers: [AkcijeStore],
  selector: 'app-evidencija-prisustva',
  styleUrl: './evidencija-prisustva.scss',
  templateUrl: './evidencija-prisustva.html',
})
export class EvidencijaPrisustva {
  private sastanakService = inject(SastanakService);
  protected readonly akcije = inject(AkcijeStore);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly sastanakId = input.required<number>();
  readonly prisustvo = input.required<PregledPrisustva>();
  readonly promena = output<PregledPrisustva>();
  readonly osvezi = output();
  private readonly mojOdgovor = computed(() => this.prisustvo().mojOdgovor);

  protected readonly otvoren = linkedSignal({
    source: this.sastanakId,
    computation: () =>
      untracked(() => {
        const pr = this.prisustvo();
        return pr.smeDaEvidentira && pr.datumEvidencije === null;
      }),
  });
  protected readonly spisak = this.sastanakService.spisak(
    computed(() => (this.otvoren() ? this.sastanakId() : undefined)),
  );
  protected readonly spratovi = computed(() =>
    this.spisak.hasValue() ? poSpratovima(this.spisak.value().stanovi) : [],
  );
  protected readonly izabrani = linkedSignal<Set<number>>(() =>
    this.spisak.hasValue() ? prisutniPoNajavi(this.spisak.value()) : new Set(),
  );

  protected readonly stanova = stanova;
  protected readonly najavioDolazak = najavioDolazak;

  constructor() {
    effect(() => {
      this.mojOdgovor();
      untracked(() => {
        if (this.spisak.hasValue()) {
          this.spisak.reload();
        }
      });
    });
  }

  protected imena(stan: StanNaSpisku): string {
    return stan.stanari.map((st) => `${st.ime} ${st.prezime}`).join(', ');
  }

  protected promeni(stanId: number, prisutan: boolean): void {
    this.izabrani.update((izabrani) => {
      const novi = new Set(izabrani);
      if (prisutan) {
        novi.add(stanId);
      } else {
        novi.delete(stanId);
      }
      return novi;
    });
  }

  protected async sacuvaj(): Promise<void> {
    if (this.akcije.akcijaUToku()) {
      return;
    }
    await this.akcije.izvrsi(
      async () => {
        const spisak = await firstValueFrom(
          this.sastanakService.evidentiraj(this.sastanakId(), [...this.izabrani()]),
        );
        this.spisak.set(spisak);
        this.promena.emit(spisak);
      },
      'Evidencija prisustva je sačuvana.',
      'Evidencija nije sačuvana. Pokušaj ponovo.',
      () => this.osvezi.emit(),
    );
    this.fokusiraj('#poruka-evidencije');
  }
}
