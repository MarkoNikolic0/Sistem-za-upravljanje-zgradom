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
} from '../glasanje-models';
import { GlasanjeService } from '../glasanje-service';
import { DANA_ANKETE, NAJVISE_DANA_ANKETE, razliciteOpcije } from '../pravila-glasanja';

type Polje = 'zgradaId' | 'pitanje' | 'opis' | 'opcije' | 'rok';

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
  selector: 'app-nova-anketa',
  styleUrl: './nova-anketa.scss',
  templateUrl: './nova-anketa.html',
})
export class NovaAnketa {
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

  protected readonly danas = new Date();
  protected readonly najkasnije = zaDana(NAJVISE_DANA_ANKETE);
  protected readonly najviseDana = NAJVISE_DANA_ANKETE;
  protected readonly greska = signal('');
  protected readonly slanje = signal(false);

  protected readonly forma = this.fb.group({
    zgradaId: this.fb.control<number | null>(null, Validators.required),
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
    rok: this.fb.control<Date | null>(zaDana(DANA_ANKETE), [Validators.required, rokNijeProsao]),
  });

  constructor() {
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
    const { zgradaId, pitanje, opis, opcije, rok } = this.forma.getRawValue();
    if (this.forma.invalid || zgradaId === null || rok === null) {
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
          pitanje: pitanje.trim(),
          opis: opis.trim() || undefined,
          opcije: opcije.map((o) => o.trim()),
          rok: krajDana(rok),
        }),
      );
      await this.router.navigate(['/glasanje'], {
        state: {
          poruka: { tip: 'uspeh', tekst: 'Anketa je pokrenuta. Stanari mogu da glasaju.' },
        } satisfies StanjeNavigacije,
      });
    } catch (err) {
      this.obradiGresku(err);
    } finally {
      this.slanje.set(false);
    }
  }

  private obradiGresku(err: unknown): void {
    const neuspeh = 'Anketa nije pokrenuta. Pokušaj ponovo za nekoliko trenutaka.';
    if (!(err instanceof HttpErrorResponse)) {
      this.greska.set(neuspeh);
      return;
    }
    for (const polje of ['pitanje', 'opis', 'opcije', 'rok'] as const) {
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
    const polja: Polje[] = ['zgradaId', 'pitanje', 'opis', 'opcije', 'rok'];
    const prvo = polja.find((polje) => this.forma.controls[polje].invalid);
    if (prvo === 'opcije') {
      const i = this.opcije.controls.findIndex((o) => o.invalid);
      this.host.nativeElement.querySelector<HTMLElement>(`#opcija-${Math.max(i, 0)}`)?.focus();
    } else if (prvo) {
      this.host.nativeElement.querySelector<HTMLElement>(`#${prvo}`)?.focus();
    }
  }
}
