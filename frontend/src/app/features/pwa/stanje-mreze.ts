import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StanjeMreze {
  private readonly stanje = signal(!navigator.onLine);
  readonly bezMreze = this.stanje.asReadonly();

  constructor() {
    window.addEventListener('online', () => this.stanje.set(false));
    window.addEventListener('offline', () => this.stanje.set(true));
  }

  serverOdgovara(): void {
    this.stanje.set(false);
  }

  serverNedostupan(): void {
    this.stanje.set(true);
  }
}
