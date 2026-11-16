import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { fokusNaSadrzaj } from '../../../shared/fokus';
import { Instalacija } from '../instalacija';

@Component({
  imports: [ButtonModule],
  selector: 'app-poziv-instalacije',
  styleUrl: './poziv-instalacije.scss',
  templateUrl: './poziv-instalacije.html',
})
export class PozivInstalacije {
  protected readonly instalacija = inject(Instalacija);
  private readonly naSadrzaj = fokusNaSadrzaj();

  protected async instaliraj(): Promise<void> {
    await this.instalacija.instaliraj();
    this.zatvori();
  }

  protected zatvori(): void {
    this.instalacija.zatvoriPoziv();
    this.naSadrzaj();
  }
}
