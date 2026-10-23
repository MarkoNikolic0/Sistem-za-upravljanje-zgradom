import { Component, computed, effect, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { greskaPolja } from '../../../shared/greske-servera';
import { nazivSprata } from '../../../shared/pipes/sprat-pipe';
import { ProfileService } from '../../profile/profile-service';
import { injectDispatch } from '@ngrx/signals/events';
import { firstValueFrom } from 'rxjs';
import { kvarEvents } from '../kvar-events';
import { KvarService } from '../kvar-service';
import { SlikaKvaraService } from '../slike/slike-kvara-service';
import { PRAVILA_SLIKA_KVARA } from '../pravila-kvara';
import {
  DANA_ZA_RESAVANJE,
  KategorijaKvara,
  LokacijaKvara,
  MAKS_NASLOV_KVARA,
  MAKS_OPIS_KVARA,
  NAZIVI_KATEGORIJA_KVARA,
  PorukaAkcije,
  StanjeNavigacijeKvara,
} from '../kvar-models';
import { NIJE_PRAZNO } from '../../../shared/nije-prazno';
import { VecPrijavljeno } from './vec-prijavljeno/vec-prijavljeno';
import { IzabraniFajlovi } from '../../../shared/izabrani-fajlovi/izabrani-fajlovi';

type Polje = 'stanId' | 'kategorija' | 'naslov' | 'opis';

@Component({
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    SelectButtonModule,
    SkeletonModule,
    TextareaModule,
    VecPrijavljeno,
    IzabraniFajlovi,
  ],
  selector: 'app-prijava-kvara',
  styleUrl: './prijava-kvara.scss',
  templateUrl: './prijava-kvara.html',
})
export class PrijavaKvara {
  private kvarService = inject(KvarService);
  private slikaKvaraService = inject(SlikaKvaraService);
  private readonly dispatch = injectDispatch(kvarEvents);
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly maksNaslov = MAKS_NASLOV_KVARA;
  protected readonly maksOpis = MAKS_OPIS_KVARA;
  protected readonly danaZaHitno = DANA_ZA_RESAVANJE.hitno;
  protected readonly pravilaSlika = PRAVILA_SLIKA_KVARA;

  protected readonly profil = this.profileService.profile();
  protected readonly greska = signal('');
  protected readonly slanje = signal(false);

  protected readonly slike = signal<File[]>([]);

  protected readonly stanovi = computed(() =>
    this.profil.hasValue() ? this.profil.value().stanovi : [],
  );

  protected readonly stanoviZaIzbor = computed(() =>
    this.stanovi().map((stan) => ({
      id: stan.id,
      naziv: `Stan ${stan.broj} · ${nazivSprata(stan.sprat)} · ${stan.zgrada.naziv}`,
    })),
  );

  protected readonly lokacije: { label: string; value: LokacijaKvara }[] = [
    { label: 'U stanu', value: 'privatni_stan' },
    { label: 'Zajednički prostor', value: 'zajednicki_prostor' },
  ];

  protected readonly kategorije = Object.entries(NAZIVI_KATEGORIJA_KVARA).map(([value, label]) => ({
    value: value as KategorijaKvara,
    label,
  }));

  protected readonly forma = this.fb.group({
    stanId: this.fb.control<number | null>(null, Validators.required),
    lokacijaTip: this.fb.nonNullable.control<LokacijaKvara>('privatni_stan'),
    kategorija: this.fb.control<KategorijaKvara | null>(null, Validators.required),
    naslov: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(NIJE_PRAZNO),
      Validators.maxLength(MAKS_NASLOV_KVARA),
    ]),
    opis: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(NIJE_PRAZNO),
      Validators.maxLength(MAKS_OPIS_KVARA),
    ]),
    hitno: this.fb.nonNullable.control(false),
  });

  constructor() {
    effect(() => {
      const stanovi = this.stanovi();
      if (stanovi.length === 1 && this.forma.controls.stanId.value === null) {
        this.forma.controls.stanId.setValue(stanovi[0].id);
      }
    });
  }

  protected nevazece(polje: Polje): boolean {
    const kontrola = this.forma.controls[polje];
    return kontrola.invalid && kontrola.touched;
  }

  protected async posalji(): Promise<void> {
    const { stanId, lokacijaTip, kategorija, naslov, opis, hitno } = this.forma.getRawValue();
    if (this.forma.invalid || stanId === null || kategorija === null) {
      this.forma.markAllAsTouched();
      this.fokusirajPrvoNevazece();
      return;
    }

    this.greska.set('');
    this.slanje.set(true);
    try {
      const kvar = await firstValueFrom(
        this.kvarService.prijavi({
          stanId,
          lokacijaTip,
          kategorija,
          naslov: naslov.trim(),
          opis: opis.trim(),
          prioritet: hitno ? 'hitno' : undefined,
        }),
      );
      this.dispatch.prijavljen(kvar);
      const poruka = await this.dodajSlike(kvar.id);
      await this.router.navigate(['/kvarovi', kvar.id], {
        state: { poruka } satisfies StanjeNavigacijeKvara,
      });
    } catch (err) {
      this.obradiGresku(err);
    } finally {
      this.slanje.set(false);
    }
  }

  private async dodajSlike(kvarId: number): Promise<PorukaAkcije | undefined> {
    const slike = this.slike();
    let nisuDodate = 0;
    for (const slika of slike) {
      try {
        await firstValueFrom(this.slikaKvaraService.dodaj(kvarId, slika));
      } catch {
        nisuDodate++;
      }
    }
    return nisuDodate > 0
      ? {
          tip: 'greska',
          tekst: `Kvar je prijavljen, ali neke slike nisu dodate (${nisuDodate} od ${slike.length}). Dodaj ih ponovo u odeljku Slike.`,
          fokus: true,
        }
      : undefined;
  }

  private obradiGresku(err: unknown): void {
    if (!(err instanceof HttpErrorResponse)) {
      this.greska.set('Kvar nije prijavljen. Pokušaj ponovo za nekoliko trenutaka.');
      return;
    }
    for (const polje of ['naslov', 'opis'] as const) {
      const poruka = greskaPolja(err, polje);
      if (poruka) {
        this.forma.controls[polje].setErrors({ server: poruka });
        this.fokusirajPrvoNevazece();
        return;
      }
    }

    this.greska.set(
      err.status === 403
        ? 'Nisi povezan sa izabranim stanom.'
        : 'Kvar nije prijavljen. Pokušaj ponovo za nekoliko trenutaka.',
    );
  }

  private fokusirajPrvoNevazece(): void {
    const polja: Polje[] = ['stanId', 'kategorija', 'naslov', 'opis'];
    const prvo = polja.find((polje) => this.forma.controls[polje].invalid);
    if (prvo) {
      this.host.nativeElement.querySelector<HTMLElement>(`#${prvo}`)?.focus();
    }
  }
}
