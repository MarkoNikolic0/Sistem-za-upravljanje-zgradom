import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Instalacija } from '../instalacija';

@Component({
  imports: [ButtonModule],
  selector: 'app-instalacija-aplikacije',
  styleUrl: './instalacija-aplikacije.scss',
  templateUrl: './instalacija-aplikacije.html',
})
export class InstalacijaAplikacije {
  protected readonly instalacija = inject(Instalacija);
}
