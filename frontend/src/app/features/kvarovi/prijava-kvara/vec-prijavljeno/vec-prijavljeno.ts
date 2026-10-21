import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthStore } from '../../../auth/sesija/auth-store';
import { KvarService } from '../../kvar-service';
import { KategorijaKvara, NAZIVI_STATUSA_KVARA, StanjeNavigacijeKvara } from '../../kvar-models';
import { BrojStanaraPipe } from '../../../../shared/pipes/broj-stanara-pipe';
import { firstValueFrom } from 'rxjs';

@Component({
  imports: [DatePipe, RouterLink, ButtonModule, MessageModule, BrojStanaraPipe],
  selector: 'app-vec-prijavljeno',
  styleUrl: './vec-prijavljeno.scss',
  templateUrl: './vec-prijavljeno.html',
})
export class VecPrijavljeno {
  private kvarService = inject(KvarService);
  private router = inject(Router);
  private authStore = inject(AuthStore);

  readonly stanId = input.required<number | null>();
  readonly kategorija = input.required<KategorijaKvara | null>();

  protected readonly naziviStatusa = NAZIVI_STATUSA_KVARA;

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
      await firstValueFrom(this.kvarService.prati(kvarId));
      await this.router.navigate(['/kvarovi', kvarId], {
        state: {
          poruka: {
            tip: 'uspeh',
            tekst: 'Pratiš ovaj kvar. Ne moraš da ga prijavljuješ ponovo.',
            fokus: true,
          },
        } satisfies StanjeNavigacijeKvara,
      });
    } catch {
      this.greska.set('Praćenje nije uspelo. Prikazano je trenutno stanje, pokušaj ponovo.');
      this.slicni.reload();
    } finally {
      this.pracenjeUToku.set(false);
    }
  }
}
