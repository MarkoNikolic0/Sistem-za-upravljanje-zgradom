import { Component, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { fokusPosleCrtanja } from '../../../../shared/fokus';
import { DetaljKvaraStore } from '../../detalj-kvara-store';
import { FormaRazloga } from '../forma-razloga/forma-razloga';

@Component({
  imports: [ButtonModule, FormaRazloga],
  selector: 'app-povlacenje-kvara',
  styleUrl: './povlacenje-kvara.scss',
  templateUrl: './povlacenje-kvara.html',
})
export class PovlacenjeKvara {
  protected readonly store = inject(DetaljKvaraStore);
  private readonly fokusiraj = fokusPosleCrtanja();

  protected readonly povlacenjeOtvoreno = signal(false);

  protected prebaciPovlacenje(): void {
    this.povlacenjeOtvoreno.update((otvorena) => !otvorena);
  }

  protected odustaniPovlacenje(): void {
    this.povlacenjeOtvoreno.set(false);
    this.fokusiraj('#povuci');
  }
}
