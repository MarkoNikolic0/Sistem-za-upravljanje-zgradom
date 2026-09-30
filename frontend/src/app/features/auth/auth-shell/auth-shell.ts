import { Component } from '@angular/core';
import { Logo } from '../../../shared/logo/logo';

const KOLONE = 6;
const SPRATOVI = 12;

// Redosled paljenja prozora (indeks = sprat * KOLONE + kolona)
const UPALJENI = [38, 31, 9, 20, 2, 25, 15, 34, 7, 29, 16, 45, 52, 60, 67];

interface Prozor {
  upaljen: boolean;
  kasnjenje: string;
}

@Component({
  selector: 'app-auth-shell',
  imports: [Logo],
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.scss',
})
export class AuthShell {
  protected readonly spratovi: Prozor[][] = Array.from({ length: SPRATOVI }, (_, sprat) =>
    Array.from({ length: KOLONE }, (_, kolona) => {
      const redosled = UPALJENI.indexOf(sprat * KOLONE + kolona);
      return {
        upaljen: redosled !== -1,
        kasnjenje: `${300 + redosled * 140}ms`,
      };
    }),
  );
}