import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { oznaciGreskuPolja, porukaServera } from '../../../shared/greske-servera';
import { NIJE_PRAZNO } from '../../../shared/nije-prazno';
import { StanSaStanarima } from '../../stanari/stanari-models';
import { StanService } from '../stan-service';
import { GRANICE_STANA } from '../zgrada-models';

const POLJA = ['broj', 'sprat', 'kvadratura'] as const;
type Polje = (typeof POLJA)[number];

@Component({
  selector: 'app-forma-stana',
  imports: [ReactiveFormsModule, ButtonModule, InputNumberModule, InputTextModule, MessageModule],
  templateUrl: './forma-stana.html',
})
export class FormaStana {
  private fb = inject(FormBuilder);
  private stanService = inject(StanService);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly zgradaId = input.required<number>();
  readonly stan = input<StanSaStanarima>();
  readonly sacuvan = output<string>();
  readonly odustani = output<void>();
  readonly zastarelo = output<string>();

  protected readonly granice = GRANICE_STANA;
  protected readonly slanje = signal(false);
  protected readonly greska = signal('');

  protected readonly forma = this.fb.group({
    broj: [
      '',
      [
        Validators.required,
        Validators.pattern(NIJE_PRAZNO),
        Validators.maxLength(GRANICE_STANA.maksBroja),
      ],
    ],
    sprat: [null as number | null, Validators.required],
    kvadratura: [null as number | null, Validators.required],
  });

  constructor() {
    effect(() => {
      const stan = this.stan();
      untracked(() => {
        this.greska.set('');
        this.forma.reset(
          stan ? { broj: stan.broj, sprat: stan.sprat, kvadratura: stan.kvadratura } : undefined,
        );
        this.fokusiraj('#stan-broj');
      });
    });
  }

  protected nevazece(polje: Polje): boolean {
    const kontrola = this.forma.controls[polje];
    return kontrola.invalid && kontrola.touched;
  }

  protected async sacuvaj(): Promise<void> {
    if (this.forma.invalid) {
      this.forma.markAllAsTouched();
      this.fokusiraj('input.ng-invalid, p-inputnumber.ng-invalid input');
      return;
    }
    const { broj, sprat, kvadratura } = this.forma.getRawValue();
    if (broj === null || sprat === null || kvadratura === null) {
      return;
    }
    const podaci = { broj: broj.trim(), sprat, kvadratura };
    const stan = this.stan();
    this.greska.set('');
    this.slanje.set(true);
    try {
      const sacuvan = await firstValueFrom(
        stan
          ? this.stanService.izmeni(stan.id, podaci)
          : this.stanService.dodaj(this.zgradaId(), podaci),
      );
      this.sacuvan.emit(sacuvan.broj);
    } catch (err) {
      this.obradiGresku(err);
    } finally {
      this.slanje.set(false);
    }
  }

  private obradiGresku(err: unknown): void {
    const neuspeh = 'Stan nije sačuvan. Pokušaj ponovo za nekoliko trenutaka.';
    if (!(err instanceof HttpErrorResponse)) {
      this.greska.set(neuspeh);
      return;
    }
    const polje = oznaciGreskuPolja(err, this.forma.controls, POLJA);
    if (polje) {
      this.fokusiraj(`#stan-${polje}`);
      return;
    }
    if (err.status === 409) {
      this.forma.controls.broj.setErrors({ server: porukaServera(err) ?? neuspeh });
      this.forma.controls.broj.markAsTouched();
      this.fokusiraj('#stan-broj');
      return;
    }
    if (err.status === 404) {
      this.zastarelo.emit(
        this.stan() ? 'Stan je u međuvremenu obrisan.' : 'Zgrada je u međuvremenu obrisana.',
      );
      return;
    }
    this.greska.set(neuspeh);
    this.fokusiraj('#greska-stana');
  }
}
