import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { porukaServera, prvaGreskaPolja } from '../../../shared/greske-servera';
import { uMnozini } from '../../../shared/mnozina';
import { nazivSprata } from '../../../shared/pipes/sprat-pipe';
import { StanService } from '../stan-service';
import { GRANICE_STANA, StanRequest } from '../zgrada-models';

const MAKS_PO_SPRATU = 20;

interface Plan {
  stanovi: StanRequest[];
  problem: string;
}

@Component({
  selector: 'app-forma-vise-stanova',
  imports: [ReactiveFormsModule, ButtonModule, InputNumberModule, MessageModule],
  templateUrl: './forma-vise-stanova.html',
})
export class FormaViseStanova implements OnInit {
  private fb = inject(FormBuilder);
  private stanService = inject(StanService);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly zgradaId = input.required<number>();
  // Brojevi stanova koji već postoje u zgradi
  readonly postojeci = input.required<string[]>();
  readonly sacuvani = output<number>();
  readonly odustani = output<void>();

  protected readonly granice = GRANICE_STANA;
  protected readonly maksPoSpratu = MAKS_PO_SPRATU;
  protected readonly slanje = signal(false);
  protected readonly greska = signal('');

  protected readonly forma = this.fb.group({
    odSprata: [1 as number | null, Validators.required],
    doSprata: [null as number | null, Validators.required],
    poSpratu: [null as number | null, Validators.required],
    prviBroj: [1 as number | null, Validators.required],
    kvadratura: [null as number | null, Validators.required],
  });
  private readonly vrednosti = toSignal(this.forma.valueChanges, {
    initialValue: this.forma.getRawValue(),
  });

  // Stanovi se numerišu redom, sprat po sprat, od prvog broja
  protected readonly plan = computed((): Plan | null => {
    const { odSprata, doSprata, poSpratu, prviBroj, kvadratura } = this.vrednosti();
    if (odSprata == null || doSprata == null || !poSpratu || !prviBroj || !kvadratura) {
      return null;
    }
    if (doSprata < odSprata) {
      return { stanovi: [], problem: 'Poslednji sprat ne može biti ispod prvog.' };
    }
    const ukupno = (doSprata - odSprata + 1) * poSpratu;
    if (ukupno > GRANICE_STANA.maksOdjednom) {
      return {
        stanovi: [],
        problem: `To je ${ukupno} stanova, a odjednom se može dodati najviše ${GRANICE_STANA.maksOdjednom}.`,
      };
    }
    const stanovi: StanRequest[] = [];
    for (let sprat = odSprata; sprat <= doSprata; sprat++) {
      for (let i = 0; i < poSpratu; i++) {
        stanovi.push({ broj: String(prviBroj + stanovi.length), sprat, kvadratura });
      }
    }
    const postojeci = new Set(this.postojeci());
    const zauzeti = stanovi.filter((s) => postojeci.has(s.broj)).map((s) => s.broj);
    return {
      stanovi,
      problem:
        zauzeti.length > 0 ? `U zgradi već postoje stanovi broj: ${zauzeti.join(', ')}.` : '',
    };
  });

  protected readonly opis = computed(() => {
    const plan = this.plan();
    if (plan === null || plan.problem !== '') {
      return '';
    }
    const prvi = plan.stanovi[0];
    const poslednji = plan.stanovi[plan.stanovi.length - 1];
    const brojevi =
      prvi === poslednji ? `broj ${prvi.broj}` : `brojevi ${prvi.broj}–${poslednji.broj}`;
    const spratovi =
      prvi.sprat === poslednji.sprat
        ? nazivSprata(prvi.sprat)
        : `${nazivSprata(prvi.sprat)} – ${nazivSprata(poslednji.sprat)}`;
    return `Biće dodato ${uMnozini(plan.stanovi.length, 'stan', 'stana', 'stanova')}: ${brojevi}, ${spratovi}.`;
  });

  ngOnInit(): void {
    const brojevi = this.postojeci().map(Number).filter(Number.isInteger);
    this.forma.controls.prviBroj.setValue(brojevi.length > 0 ? Math.max(...brojevi) + 1 : 1);
    this.fokusiraj('#vise-od-sprata');
  }

  protected nevazece(polje: keyof typeof this.forma.controls): boolean {
    const kontrola = this.forma.controls[polje];
    return kontrola.invalid && kontrola.touched;
  }

  protected async sacuvaj(): Promise<void> {
    const plan = this.plan();
    if (this.forma.invalid || plan === null) {
      this.forma.markAllAsTouched();
      this.fokusiraj('p-inputnumber.ng-invalid input');
      return;
    }
    if (plan.problem !== '') {
      this.fokusiraj('#plan-stanova');
      return;
    }
    this.greska.set('');
    this.slanje.set(true);
    try {
      const dodati = await firstValueFrom(
        this.stanService.dodajVise(this.zgradaId(), plan.stanovi),
      );
      this.sacuvani.emit(dodati.length);
    } catch (err) {
      const neuspeh = 'Stanovi nisu dodati. Pokušaj ponovo za nekoliko trenutaka.';
      this.greska.set(
        err instanceof HttpErrorResponse
          ? (prvaGreskaPolja(err) ??
              (err.status === 409 ? porukaServera(err) : undefined) ??
              neuspeh)
          : neuspeh,
      );
      this.fokusiraj('#greska-stanova');
    } finally {
      this.slanje.set(false);
    }
  }
}
