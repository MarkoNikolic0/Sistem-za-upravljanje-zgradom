import { Component, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PushObavestenja } from '../push-obavestenja';

@Component({
  imports: [ButtonModule, MessageModule],
  selector: 'app-obavestenja-na-uredjaju',
  styleUrl: './obavestenja-na-uredjaju.scss',
  templateUrl: './obavestenja-na-uredjaju.html',
})
export class ObavestenjaNaUredjaju {
  protected readonly push = inject(PushObavestenja);
  protected readonly radi = signal(false);
  protected readonly greska = signal<string | null>(null);

  protected async promeni(): Promise<void> {
    if (this.radi()) {
      return;
    }
    this.radi.set(true);
    this.greska.set(null);
    try {
      if (this.push.stanje() === 'ukljuceno') {
        await this.push.iskljuci();
      } else {
        await this.push.ukljuci();
      }
    } catch (greska) {
      this.greska.set(this.push.porukaGreske(greska));
    } finally {
      this.radi.set(false);
    }
  }
}
