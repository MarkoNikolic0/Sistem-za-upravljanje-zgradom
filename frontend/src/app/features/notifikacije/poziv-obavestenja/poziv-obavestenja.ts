import {
  afterNextRender,
  Component,
  computed,
  DOCUMENT,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { lokalnoSkladiste } from '../../../shared/lokalno-skladiste';
import { PushObavestenja } from '../push-obavestenja';

const KLJUC_ZATVOREN = 'poziv-obavestenja-zatvoren';

type Ishod = 'ukljuceno' | 'odbijeno';

@Component({
  imports: [RouterLink, ButtonModule, MessageModule],
  selector: 'app-poziv-obavestenja',
  styleUrl: './poziv-obavestenja.scss',
  templateUrl: './poziv-obavestenja.html',
})
export class PozivObavestenja {
  private push = inject(PushObavestenja);
  private document = inject(DOCUMENT);
  private injector = inject(Injector);
  private readonly fokusiraj = fokusPosleCrtanja();
  private skladiste = lokalnoSkladiste();

  private readonly zatvoren = signal(this.skladiste.procitaj(KLJUC_ZATVOREN) === '1');
  protected readonly radi = signal(false);
  protected readonly ishod = signal<Ishod | null>(null);
  protected readonly greska = signal<string | null>(null);

  protected readonly stanje = this.push.stanje;
  protected readonly prikazan = computed(
    () =>
      !this.zatvoren() &&
      (this.stanje() === 'iskljuceno' || this.stanje() === 'potrebna-instalacija'),
  );

  protected async ukljuci(): Promise<void> {
    if (this.radi()) {
      return;
    }
    this.radi.set(true);
    this.greska.set(null);
    try {
      await this.push.ukljuci();
      const stanje = this.push.stanje();
      if (stanje === 'ukljuceno' || stanje === 'odbijeno') {
        this.ishod.set(stanje);
        this.fokusiraj('#ishod-poziva');
      }
    } catch (greska) {
      this.greska.set(this.push.porukaGreske(greska));
    } finally {
      this.radi.set(false);
    }
  }

  protected zatvori(): void {
    this.skladiste.zapamti(KLJUC_ZATVOREN, '1');
    this.zatvoren.set(true);
    this.ishod.set(null);
    afterNextRender(() => this.document.getElementById('sadrzaj')?.focus(), {
      injector: this.injector,
    });
  }
}
