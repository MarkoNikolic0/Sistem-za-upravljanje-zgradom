import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthStore } from '../../../auth/sesija/auth-store';
import { KvarService } from '../../kvar-service';
import { KvarStore } from '../../kvar-store';
import { KategorijaKvara, NAZIVI_STATUSA_KVARA } from '../../kvar-models';
import { brojStanara } from '../../pravila-kvara';

@Component({
  imports: [DatePipe, RouterLink, ButtonModule, MessageModule],
  selector: 'app-vec-prijavljeno',
  styleUrl: './vec-prijavljeno.scss',
  templateUrl: './vec-prijavljeno.html',
})
export class VecPrijavljeno {
  private kvarService = inject(KvarService);
  private store = inject(KvarStore);
  private router = inject(Router);
  private authStore = inject(AuthStore);

  readonly stanId = input.required<number | null>();
  readonly kategorija = input.required<KategorijaKvara | null>();

  protected readonly naziviStatusa = NAZIVI_STATUSA_KVARA;
  protected readonly brojStanara = brojStanara;
  protected readonly ja = computed(() => this.authStore.korisnik()?.id);

  private readonly upit = computed(() => {
    const stanId = this.stanId();
    const kategorija = this.kategorija();
    return stanId !== null && kategorija !== null ? { stanId, kategorija } : undefined;
  });

  private readonly slicni = this.kvarService.slicni(this.upit);
  protected readonly lista = computed(() => (this.slicni.hasValue() ? this.slicni.value() : []));

  protected readonly pracenjeUToku = signal(false);
  protected readonly greska = linkedSignal({ source: this.upit, computation: () => '' });

  protected async prati(kvarId: number): Promise<void> {
    this.greska.set('');
    this.pracenjeUToku.set(true);
    try {
      await this.store.pratiUmestoPrijave(kvarId);
      await this.router.navigate(['/kvarovi', kvarId]);
    } catch {
      this.greska.set('Praćenje nije uspelo. Prikazano je trenutno stanje, pokušaj ponovo.');
      this.slicni.reload();
    } finally {
      this.pracenjeUToku.set(false);
    }
  }
}
