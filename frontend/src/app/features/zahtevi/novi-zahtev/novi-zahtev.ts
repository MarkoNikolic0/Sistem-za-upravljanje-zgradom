import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { ZgradaService } from '../../zgrade/zgrada-service';
import { ZahtevService } from '../zahtev-service';
import { NAZIVI_STATUSA_ZAHTEVA } from '../zahtev-models';

@Component({
  imports: [ReactiveFormsModule, ButtonModule, MessageModule, SelectModule],
  selector: 'app-novi-zahtev',
  styleUrl: './novi-zahtev.scss',
  templateUrl: './novi-zahtev.html',
})
export class NoviZahtev {
  private zahtevService = inject(ZahtevService);
  private zgradaService = inject(ZgradaService);
  private fb = inject(FormBuilder);

  protected readonly naziviStatusa = NAZIVI_STATUSA_ZAHTEVA;

  protected readonly salje = signal(false);
  protected readonly greska = signal('');
  protected readonly poslat = signal(false);

  protected readonly forma = this.fb.group({
    zgradaId: this.fb.control<number | null>(null, Validators.required),
    stanId: this.fb.control<number | null>(null, Validators.required),
  });

  private readonly zgradaId = toSignal(this.forma.controls.zgradaId.valueChanges, {
    initialValue: null,
  });

  protected readonly zgrade = this.zgradaService.zgrade();
  protected readonly stanovi = this.zgradaService.stanovi(this.zgradaId);
  protected readonly zahtevi = this.zahtevService.mojiZahtevi();

  protected readonly stanoviZaIzbor = computed(() =>
    this.stanovi.hasValue()
      ? this.stanovi.value().map((stan) => ({
          id: stan.id,
          naziv: `Stan ${stan.broj} · ${stan.sprat}. sprat`,
        }))
      : [],
  );

  protected readonly neobradjeni = computed(() =>
    this.zahtevi.hasValue() ? this.zahtevi.value().filter((z) => z.status !== 'prihvacen') : [],
  );

  constructor() {
    this.forma.controls.zgradaId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.forma.controls.stanId.reset());
  }

  nevazece(polje: 'zgradaId' | 'stanId'): boolean {
    const kontrola = this.forma.controls[polje];
    return kontrola.invalid && kontrola.touched;
  }

  posalji(): void {
    const stanId = this.forma.controls.stanId.value;
    if (this.forma.invalid || stanId === null) {
      this.forma.markAllAsTouched();
      return;
    }

    this.greska.set('');
    this.poslat.set(false);
    this.salje.set(true);

    this.zahtevService
      .posalji({ stanId })
      .pipe(finalize(() => this.salje.set(false)))
      .subscribe({
        next: () => {
          this.forma.reset();
          this.poslat.set(true);
          this.zahtevi.reload();
        },
        error: (err: HttpErrorResponse) =>
          this.greska.set(
            err.status === 409
              ? err.error?.message
              : 'Zahtev nije poslat. Pokušaj ponovo za nekoliko trenutaka.',
          ),
      });
  }
}
