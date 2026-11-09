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

function prisutniPoNajavi(spisak: SpisakPrisustva): Set<number> {
  return new Set(
    spisak.stanovi
      .filter((s) =>
        spisak.datumEvidencije === null ? s.stanari.some((st) => st.dolazi) : s.prisutan,
      )
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
  readonly promena = output();

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

  constructor() {
    effect(() => {
      this.prisustvo();
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

  protected najavaStana(stan: StanNaSpisku): 'dolazi' | 'ne' | null {
    if (stan.stanari.some((st) => st.dolazi === true)) {
      return 'dolazi';
    }
    return stan.stanari.some((st) => st.dolazi === false) ? 'ne' : null;
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
        this.promena.emit();
      },
      'Evidencija prisustva je sačuvana.',
      'Evidencija nije sačuvana. Pokušaj ponovo.',
      () => this.promena.emit(),
    );
    this.fokusiraj('#poruka-evidencije');
  }
}
