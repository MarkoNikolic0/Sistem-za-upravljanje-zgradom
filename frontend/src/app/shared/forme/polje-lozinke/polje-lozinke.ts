import { Component, input, signal } from '@angular/core';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

@Component({
  imports: [IconFieldModule, InputIconModule],
  selector: 'app-polje-lozinke',
  styleUrl: './polje-lozinke.scss',
  templateUrl: './polje-lozinke.html',
})
export class PoljeLozinke {
  readonly oznaka = input('lozinku');
  readonly sakrivena = signal(true);
}
