import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ZgradaOsnovno } from '../../zgrade/zgrada-models';
import { HITNE_SLUZBE } from '../kontakt-models';
import { KontaktService } from '../kontakt-service';
import { RedKontakta } from '../red-kontakta/red-kontakta';

@Component({
  selector: 'app-vazni-kontakti',
  imports: [RouterLink, ButtonModule, SkeletonModule, RedKontakta],
  templateUrl: './vazni-kontakti.html',
  styleUrl: './vazni-kontakti.scss',
  // Sopstvena visina za lepljenje desne kolone na početnoj (home.scss)
  host: { '[style.--visina-kontakata.px]': 'visina()' },
})
export class VazniKontakti {
  readonly zgrade = input.required<ZgradaOsnovno[]>();
  readonly zgradaUpravnika = input<number | null>(null);

  private readonly zgradeId = computed(() => this.zgrade().map((z) => z.id));
  protected readonly kontakti = inject(KontaktService).kontaktiZgrada(this.zgradeId);

  protected readonly hitneSluzbe = HITNE_SLUZBE;

  protected readonly visina = signal(0);

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const posmatrac = new ResizeObserver(([unos]) =>
      this.visina.set(unos.borderBoxSize[0].blockSize),
    );
    afterNextRender(() => posmatrac.observe(element));
    inject(DestroyRef).onDestroy(() => posmatrac.disconnect());
  }
}
