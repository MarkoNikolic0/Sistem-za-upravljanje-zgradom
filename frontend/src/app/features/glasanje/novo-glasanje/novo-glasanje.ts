import { Component, computed, effect, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { greskaPolja, porukaServera } from '../../../shared/greske-servera';
import { NIJE_PRAZNO } from '../../../shared/nije-prazno';
import { krajDana, rokNijeProsao, zaDana } from '../../../shared/datum';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { StanjeNavigacije } from '../../../shared/poruka';
import { injectZgradeKorisnika } from '../../zgrade/zgrade-korisnika';
import {
  MAKS_OPCIJA_TEKST,
  MAKS_OPIS,
  MAKS_PITANJE,
  NAJMANJE_OPCIJA,
  NAJVISE_OPCIJA,
  VecinaOdluke,
  VECINE_ODLUKE,
  VrstaGlasanja,
  VRSTE_GLASANJA,
} from '../glasanje-models';
import { GlasanjeService } from '../glasanje-service';
import { DANA_ANKETE, NAJVISE_DANA_ANKETE, razliciteOpcije } from '../pravila-glasanja';
import { toSignal } from '@angular/core/rxjs-interop';

type Polje = 'zgradaId' | 'vrsta' | 'pitanje' | 'opis' | 'opcije' | 'vecina' | 'rok';

@Component({
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
    TextareaModule,
  ],
  selector: 'app-novo-glasanje',
  styleUrl: './novo-glasanje.scss',
  templateUrl: './novo-glasanje.html',
})
export class NovoGlasanje {
  private glasanjeService = inject(GlasanjeService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly fokusiraj = fokusPosleCrtanja();

  private readonly zgradeKorisnika = injectZgradeKorisnika();
  protected readonly ucitano = this.zgradeKorisnika.ucitano;
  protected readonly greskaUcitavanja = this.zgradeKorisnika.greska;
  // Upravnik pravi anketu samo u zgradi kojom upravlja, admin u bilo kojoj
  protected readonly zgrade = computed(() => {
    const profil = this.zgradeKorisnika.profil;
    if (!profil.hasValue()) {
      return [];
    }
    const zgrada = profil.value().zgrada;
    return this.zgradeKorisnika.admin() ? this.zgradeKorisnika.zgrade() : zgrada ? [zgrada] : [];
  });

  protected readonly maksPitanje = MAKS_PITANJE;
  protected readonly maksOpis = MAKS_OPIS;
  protected readonly maksOpcija = MAKS_OPCIJA_TEKST;
  protected readonly najviseOpcija = NAJVISE_OPCIJA;
  protected readonly najmanjeOpcija = NAJMANJE_OPCIJA;

  protected readonly vrste = Object.entries(VRSTE_GLASANJA).map(([value, vrsta]) => ({
    value: value as VrstaGlasanja,
    ...vrsta,
  }));
  protected readonly vecine = Object.entries(VECINE_ODLUKE).map(([value, vecina]) => ({
    value: value as VecinaOdluke,
    ...vecina,
  }));

  protected readonly danas = new Date();
  protected readonly najkasnije = zaDana(NAJVISE_DANA_ANKETE);
  protected readonly najviseDana = NAJVISE_DANA_ANKETE;
  protected readonly greska = signal('');
  protected readonly slanje = signal(false);

  protected readonly forma = this.fb.group({
    zgradaId: this.fb.control<number | null>(null, Validators.required),
    vrsta: this.fb.nonNullable.control<VrstaGlasanja>('anketa'),
    pitanje: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(NIJE_PRAZNO),
      Validators.maxLength(MAKS_PITANJE),
    ]),
    opis: this.fb.nonNullable.control('', Validators.maxLength(MAKS_OPIS)),
    opcije: this.fb.nonNullable.array(
      Array.from({ length: NAJMANJE_OPCIJA }, () => this.novaOpcija()),
      { validators: razliciteOpcije },
    ),
    vecina: this.fb.control<VecinaOdluke | null>(
      { value: null, disabled: true },
      Validators.required,
    ),
    rok: this.fb.control<Date | null>(zaDana(DANA_ANKETE), [Validators.required, rokNijeProsao]),
  });

  protected readonly vrsta = toSignal(this.forma.controls.vrsta.valueChanges, {
    initialValue: this.forma.controls.vrsta.value,
  });

  constructor() {
    effect(() => {
      const odluka = this.vrsta() === 'odluka';
      const { opcije, vecina } = this.forma.controls;
      if (odluka) {
        opcije.disable();
        vecina.enable();
      } else {
        opcije.enable();
        vecina.disable();
      }
    });
    effect(() => {
      const zgrade = this.zgrade();
      if (zgrade.length === 1 && this.forma.controls.zgradaId.value === null) {
        this.forma.controls.zgradaId.setValue(zgrade[0].id);
      }
    });
  }

  private novaOpcija() {
    return this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(NIJE_PRAZNO),
      Validators.maxLength(MAKS_OPCIJA_TEKST),
    ]);
  }

  protected get opcije() {
    return this.forma.controls.opcije;
  }

  protected dodajOpciju(): void {
    this.opcije.push(this.novaOpcija());
    this.fokusiraj(`#opcija-${this.opcije.length - 1}`);
  }

  protected ukloniOpciju(i: number): void {
    this.opcije.removeAt(i);
    this.fokusiraj(`#opcija-${Math.min(i, this.opcije.length - 1)}`);
  }

  protected nevazece(polje: Polje): boolean {
    const kontrola = this.forma.controls[polje];
    return kontrola.invalid && kontrola.touched;
  }

  protected nevazecaOpcija(i: number): boolean {
    const kontrola = this.opcije.at(i);
    return kontrola.invalid && kontrola.touched;
  }

  // Greška cele liste: iste opcije ili poruka servera
  protected greskaListeOpcija(): string | null {
    const greske = this.opcije.errors;
    if (!greske || !this.opcije.touched) {
      return null;
    }
    return greske['server'] ?? (greske['iste'] ? 'Opcije moraju biti različite.' : null);
  }

  protected async posalji(): Promise<void> {
    const { zgradaId, vrsta, pitanje, opis, opcije, vecina, rok } = this.forma.getRawValue();
    const odluka = vrsta === 'odluka';
    if (this.forma.invalid || zgradaId === null || rok === null || (odluka && vecina === null)) {
      this.forma.markAllAsTouched();
      this.fokusirajPrvoNevazece();
      return;
    }

    this.greska.set('');
    this.slanje.set(true);
    try {
      await firstValueFrom(
        this.glasanjeService.napravi({
          zgradaId,
          vrsta,
          pitanje: pitanje.trim(),
          opis: opis.trim() || undefined,
          ...(odluka ? { vecina: vecina ?? undefined } : { opcije: opcije.map((o) => o.trim()) }),
          rok: krajDana(rok),
        }),
      );
      await this.router.navigate(['/glasanje'], {
        state: {
          poruka: {
            tip: 'uspeh',
            tekst: odluka
              ? 'Glasanje o odluci je pokrenuto. Vlasnici mogu da glasaju.'
              : 'Anketa je pokrenuta. Stanari mogu da glasaju.',
          },
        } satisfies StanjeNavigacije,
      });
    } catch (err) {
      this.obradiGresku(err);
    } finally {
      this.slanje.set(false);
    }
  }

  private obradiGresku(err: unknown): void {
    const neuspeh = 'Glasanje nije pokrenuto. Pokušaj ponovo za nekoliko trenutaka.';
    if (!(err instanceof HttpErrorResponse)) {
      this.greska.set(neuspeh);
      return;
    }
    for (const polje of ['vrsta', 'pitanje', 'opis', 'opcije', 'vecina', 'rok'] as const) {
      const poruka = greskaPolja(err, polje);
      if (poruka) {
        this.forma.controls[polje].setErrors({ server: poruka });
        this.fokusirajPrvoNevazece();
        return;
      }
    }
    this.greska.set(
      err.status === 403 || err.status === 404 ? (porukaServera(err) ?? neuspeh) : neuspeh,
    );
  }

  private fokusirajPrvoNevazece(): void {
    const polja: Polje[] = ['zgradaId', 'vrsta', 'pitanje', 'opis', 'opcije', 'vecina', 'rok'];
    const prvo = polja.find((polje) => this.forma.controls[polje].invalid);
    if (prvo === 'opcije') {
      const i = this.opcije.controls.findIndex((o) => o.invalid);
      this.host.nativeElement.querySelector<HTMLElement>(`#opcija-${Math.max(i, 0)}`)?.focus();
    } else if (prvo === 'vecina') {
      this.host.nativeElement
        .querySelector<HTMLElement>('input[formControlName="vecina"]')
        ?.focus();
    } else if (prvo) {
      this.host.nativeElement.querySelector<HTMLElement>(`#${prvo}`)?.focus();
    }
  }
}
