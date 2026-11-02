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
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { uMnozini } from '../../../shared/mnozina';
import { formatirajTelefon } from '../../../shared/telefon';
import { injectZgradeUpravnika } from '../../zgrade/zgrade-korisnika';
import { StanSaStanarima } from '../stanari-models';
import { StanariService } from '../stanari-service';
import { pretraziStanove } from '../pretraga-stanara';

interface Sprat {
  sprat: number;
  stanovi: StanSaStanarima[];
}

@Component({
  imports: [FormsModule, RouterLink, InputTextModule, MessageModule, SelectModule, SkeletonModule],
  selector: 'app-stanari-zgrade',
  templateUrl: './stanari-zgrade.html',
  styleUrl: './stanari-zgrade.scss',
})
export class StanariZgrade {
  readonly zgrada = input(undefined, { transform: numberAttribute });

  private readonly izbor = injectZgradeUpravnika();
  protected readonly zgrade = this.izbor.zgrade;
  protected readonly ucitano = this.izbor.ucitano;
  protected readonly greska = this.izbor.greska;

  protected readonly zgradaId = linkedSignal<number | null>(() => {
    const zgrade = this.zgrade();
    return (zgrade.find((z) => z.id === this.zgrada()) ?? zgrade[0])?.id ?? null;
  });
  protected readonly stanovi = inject(StanariService).stanovi(this.zgradaId);

  protected readonly upit = signal('');
  protected readonly pronadjeni = computed(() =>
    this.stanovi.hasValue() ? pretraziStanove(this.stanovi.value(), this.upit()) : [],
  );

  // Fasada: najviši sprat gore, kao na zgradi
  protected readonly spratovi = computed(() => {
    const spratovi = new Map<number, StanSaStanarima[]>();
    for (const stan of this.pronadjeni()) {
      spratovi.set(stan.sprat, [...(spratovi.get(stan.sprat) ?? []), stan]);
    }
    return [...spratovi.entries()]
      .map(([sprat, stanovi]): Sprat => ({ sprat, stanovi }))
      .sort((a, b) => b.sprat - a.sprat);
  });

  protected readonly zbir = computed(() => {
    if (!this.stanovi.hasValue()) {
      return '';
    }
    const stanovi = this.stanovi.value();
    const naseljeni = stanovi.filter((s) => s.stanari.length > 0).length;
    const ljudi = stanovi.reduce((zbir, s) => zbir + s.stanari.length, 0);
    return `${naseljeni} od ${uMnozini(stanovi.length, 'stana', 'stana', 'stanova')} naseljeno · ${uMnozini(ljudi, 'stanar', 'stanara', 'stanara')}`;
  });

  protected readonly rezultat = computed(() =>
    this.upit().trim() === ''
      ? ''
      : `Pronađeno: ${uMnozini(this.pronadjeni().length, 'stan', 'stana', 'stanova')}`,
  );

  protected readonly telefon = formatirajTelefon;

  protected nazivSprata(sprat: number): string {
    return sprat === 0 ? 'Prizemlje' : `${sprat}. sprat`;
  }

  protected promeniZgradu(id: number): void {
    this.zgradaId.set(id);
    this.upit.set('');
  }
}
