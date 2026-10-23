import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ImageModule } from 'primeng/image';
import { velicinaFajla } from '../../../shared/fajlovi';
import { PrilogOglasa } from '../oglas-models';

@Component({
  imports: [ButtonModule, ImageModule],
  selector: 'app-prilozi-oglasa',
  styleUrl: './prilozi-oglasa.scss',
  templateUrl: './prilozi-oglasa.html',
})
export class PriloziOglasa {
  readonly prilozi = input.required<PrilogOglasa[]>();
  readonly uklanjanje = input(false);
  readonly otpremanje = input(false);
  readonly ukloni = output<PrilogOglasa>();

  protected readonly velicina = velicinaFajla;
}
