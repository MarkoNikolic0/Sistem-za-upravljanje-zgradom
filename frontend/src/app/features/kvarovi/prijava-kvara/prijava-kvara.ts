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
import { nazivSprata } from '../../../shared/sprat-pipe';
import { ProfileService } from '../../profile/profile-service';
import { KvarStore } from '../kvar-store';
import {
  KategorijaKvara,
  LokacijaKvara,
  MAKS_NASLOV_KVARA,
  MAKS_OPIS_KVARA,
  NAZIVI_KATEGORIJA_KVARA,
} from '../kvar-models';

type Polje = 'stanId' | 'kategorija' | 'naslov' | 'opis';

const NIJE_PRAZNO = /\S/;

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
  ],
  selector: 'app-prijava-kvara',
  styleUrl: './prijava-kvara.scss',
  templateUrl: './prijava-kvara.html',
})
export class PrijavaKvara {
  protected readonly store = inject(KvarStore);
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly maksNaslov = MAKS_NASLOV_KVARA;
  protected readonly maksOpis = MAKS_OPIS_KVARA;

  protected readonly profil = this.profileService.profile();
  protected readonly greska = signal('');

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
    try {
      const kvar = await this.store.prijavi({
        stanId,
        lokacijaTip,
        kategorija,
        naslov: naslov.trim(),
        opis: opis.trim(),
        prioritet: hitno ? 'hitno' : undefined,
      });
      await this.router.navigate(['/kvarovi', kvar.id]);
    } catch (err) {
      this.obradiGresku(err);
    }
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
