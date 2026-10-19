import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TIPOVI_SLIKE } from '../../kvar-models';
import { greskaIzboraSlika, POMOC_ZA_SLIKE } from '../../pravila-kvara';

@Component({
  imports: [ButtonModule],
  selector: 'app-izbor-slika',
  styleUrl: './izbor-slika.scss',
  templateUrl: './izbor-slika.html',
})
export class IzborSlika {
  readonly vecIma = input.required<number>();
  readonly otpremanje = input(false);
  readonly greskaId = input<string>();
  readonly izabrano = output<File[]>();
  readonly greska = output<string>();

  protected readonly tipovi = TIPOVI_SLIKE.join(',');
  protected readonly pomoc = POMOC_ZA_SLIKE;

  protected izaberi(polje: HTMLInputElement): void {
    const fajlovi = Array.from(polje.files ?? []);
    polje.value = '';
    if (fajlovi.length === 0) {
      return;
    }
    const greska = greskaIzboraSlika(fajlovi, this.vecIma());
    if (greska) {
      this.greska.emit(greska);
    } else {
      this.izabrano.emit(fajlovi);
    }
  }
}
