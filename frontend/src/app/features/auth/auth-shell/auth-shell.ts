import { Component } from '@angular/core';

const KOLONE = 6;
const SPRATOVI = 7;

// Redosled paljenja prozora
const UPALJENI = [38, 31, 9, 20, 2, 25, 15, 34, 7, 29, 16];

interface Prozor {
  upaljen: boolean;
  kasnjenje: string;
}

@Component({
  selector: 'app-auth-shell',
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.scss',
})
export class AuthShell {
  protected readonly prozori: Prozor[] = Array.from({ length: KOLONE * SPRATOVI }, (_, i) => {
    const redosled = UPALJENI.indexOf(i);
    return {
      upaljen: redosled !== -1,
      kasnjenje: `${300 + redosled * 140}ms`,
    };
  });
}
