import { Component, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { greskaIzbora, pomocZaFajlove, PravilaFajlova } from '../fajlovi';

@Component({
  imports: [ButtonModule],
  selector: 'app-izbor-fajlova',
  styleUrl: './izbor-fajlova.scss',
  templateUrl: './izbor-fajlova.html',
})
export class IzborFajlova {
  readonly pravila = input.required<PravilaFajlova>();
  readonly oznaka = input.required<string>();
  readonly vecIma = input.required<number>();
  readonly otpremanje = input(false);
  readonly greskaId = input<string>();
  readonly izabrano = output<File[]>();
  readonly greska = output<string>();

  protected readonly tipovi = computed(() => this.pravila().tipovi.join(','));
  protected readonly pomoc = computed(() => pomocZaFajlove(this.pravila()));

  protected izaberi(polje: HTMLInputElement): void {
    const fajlovi = Array.from(polje.files ?? []);
    polje.value = '';
    if (fajlovi.length === 0) {
      return;
    }
    const greska = greskaIzbora(fajlovi, this.vecIma(), this.pravila());
    if (greska) {
      this.greska.emit(greska);
    } else {
      this.izabrano.emit(fajlovi);
    }
  }
}
