import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { osveziPosle } from '../../../shared/stanje/osvezavanje';
import { uMnozini } from '../../../shared/tekst/mnozina';
import { ZgradaOsnovno } from '../../zgrade/zgrada-models';
import { OSVEZI_LINKOVE_MS } from '../dokument-models';
import { DokumentService } from '../dokument-service';
import { RedDokumenta } from '../red-dokumenta/red-dokumenta';
import { PokusajPonovo } from '../../../shared/pokusaj-ponovo';

@Component({
  selector: 'app-dokumenti-ukratko',
  imports: [PokusajPonovo, RouterLink, ButtonModule, SkeletonModule, RedDokumenta],
  templateUrl: './dokumenti-ukratko.html',
  styleUrl: './dokumenti-ukratko.scss',
})
export class DokumentiUkratko {
  readonly zgrade = input.required<ZgradaOsnovno[]>();
  readonly upravlja = input<number[]>([]);

  private readonly zgradeId = computed(() => this.zgrade().map((z) => z.id));
  protected readonly dokumenti = inject(DokumentService).najnovijiZgrada(this.zgradeId);

  constructor() {
    osveziPosle(this.dokumenti, OSVEZI_LINKOVE_MS);
  }

  protected jos(ukupno: number, prikazano: number): string {
    return `Još ${uMnozini(ukupno - prikazano, 'dokument', 'dokumenta', 'dokumenata')}`;
  }
}
