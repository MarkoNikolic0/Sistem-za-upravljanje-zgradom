import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ImageModule } from 'primeng/image';
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
  readonly ukloni = output<PrilogOglasa>();
}
