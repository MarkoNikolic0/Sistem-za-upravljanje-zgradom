import { Component, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { fokusPosleCrtanja } from '../../../../shared/fokus';
import { KvarStore } from '../../kvar-store';
import { FormaRazloga } from '../forma-razloga/forma-razloga';

@Component({
  imports: [ButtonModule, FormaRazloga],
  selector: 'app-povlacenje-kvara',
  styleUrl: './povlacenje-kvara.scss',
  templateUrl: './povlacenje-kvara.html',
})
export class PovlacenjeKvara {
  protected readonly store = inject(KvarStore);
  private readonly fokusiraj = fokusPosleCrtanja();

  protected readonly formaOtvorena = signal(false);

  protected prebaciFormu(): void {
    this.formaOtvorena.update((otvorena) => !otvorena);
  }

  protected odustani(): void {
    this.formaOtvorena.set(false);
    this.fokusiraj('#povuci');
  }
}
