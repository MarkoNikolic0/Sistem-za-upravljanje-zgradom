import { Component, computed, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { uMnozini } from '../../../shared/tekst/mnozina';
import { Poruka } from '../../../shared/stanje/poruka';
import { SpratPipe } from '../../../shared/spratovi/sprat-pipe';
import { poSpratovima } from '../../../shared/spratovi/spratovi';
import { AkcijeStore } from '../../../shared/stanje/with-akcije';
import { StanSaStanarima } from '../../stanari/stanari-models';
import { StanariService } from '../../stanari/stanari-service';
import { FormaStana } from '../forma-stana/forma-stana';
import { FormaViseStanova } from '../forma-vise-stanova/forma-vise-stanova';
import { StanService } from '../stan-service';

type Forma = 'jedan' | 'vise' | StanSaStanarima;

@Component({
  selector: 'app-stanovi-zgrade',
  imports: [ButtonModule, MessageModule, SkeletonModule, SpratPipe, FormaStana, FormaViseStanova],
  providers: [AkcijeStore],
  templateUrl: './stanovi-zgrade.html',
  styleUrl: './stanovi-zgrade.scss',
})
export class StanoviZgrade {
  private stanariService = inject(StanariService);
  private stanService = inject(StanService);
  private confirmationService = inject(ConfirmationService);
  protected readonly akcije = inject(AkcijeStore);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly zgradaId = input.required<number>();
  protected readonly stanovi = this.stanariService.stanovi(this.zgradaId);
  protected readonly spratovi = computed(() =>
    this.stanovi.hasValue() ? poSpratovima(this.stanovi.value()) : [],
  );
  protected readonly brojevi = computed(() =>
    this.stanovi.hasValue() ? this.stanovi.value().map((s) => s.broj) : [],
  );

  protected readonly forma = signal<Forma | null>(null);
  protected readonly izmena = computed(() => {
    const forma = this.forma();
    return typeof forma === 'object' ? forma : null;
  });

  protected readonly uMnozini = uMnozini;

  protected otvori(forma: Forma): void {
    this.akcije.ponisti();
    this.forma.set(forma);
  }

  protected zatvori(): void {
    const forma = this.forma();
    this.forma.set(null);
    this.fokusiraj(
      forma === 'jedan'
        ? '#dodaj-stan'
        : forma === 'vise'
          ? '#dodaj-vise'
          : `#izmeni-stan-${forma?.id}`,
    );
  }

  protected sacuvan(broj: string): void {
    const novi = this.forma() === 'jedan';
    this.zavrsi({
      tip: 'uspeh',
      tekst: novi ? `Dodat je stan ${broj}.` : `Stan ${broj} je izmenjen.`,
    });
  }

  protected sacuvani(broj: number): void {
    this.zavrsi({
      tip: 'uspeh',
      tekst: `Dodato: ${uMnozini(broj, 'stan', 'stana', 'stanova')}.`,
    });
  }

  protected zastarelo(tekst: string): void {
    this.zavrsi({ tip: 'greska', tekst });
  }

  protected obrisi(event: Event, stan: StanSaStanarima): void {
    const dugme = event.currentTarget as HTMLElement;
    this.akcije.ponisti();
    this.confirmationService.confirm({
      header: 'Brisanje stana',
      message: `Obrisati stan ${stan.broj}? Stan sa kvarovima, zahtevima ili glasovima ne može da se obriše.`,
      defaultFocus: 'reject',
      rejectButtonProps: { label: 'Odustani', severity: 'secondary', outlined: true },
      acceptButtonProps: { label: 'Obriši', severity: 'danger' },
      accept: async () => {
        const osvezi = () => this.stanovi.reload();
        await this.akcije.izvrsi(
          async () => {
            await firstValueFrom(this.stanService.obrisi(stan.id));
            osvezi();
          },
          `Stan ${stan.broj} je obrisan.`,
          'Stan nije obrisan. Pokušaj ponovo.',
          osvezi,
          { tip: 'uspeh', tekst: `Stan ${stan.broj} je već obrisan.` },
        );
        this.fokusiraj('#poruka-stanova');
      },
      reject: () => dugme.focus(),
    });
  }

  private zavrsi(poruka: Poruka): void {
    this.forma.set(null);
    this.stanovi.reload();
    this.akcije.prikaziPoruku(poruka);
    this.fokusiraj('#poruka-stanova');
  }
}
