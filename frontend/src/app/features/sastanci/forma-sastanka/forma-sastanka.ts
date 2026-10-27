import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { greskaPolja, porukaServera } from '../../../shared/greske-servera';
import { NIJE_PRAZNO } from '../../../shared/nije-prazno';
import { zaDana } from '../../../shared/datum';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { idIzAdrese, jeIspravanId } from '../../../shared/ispravan-id';
import { StanjeNavigacije } from '../../../shared/poruka';
import { injectZgradeKorisnika } from '../../zgrade/zgrade-korisnika';
import { GlasanjeService } from '../../glasanje/glasanje-service';
import {
  MAKS_LOKACIJA,
  MAKS_NASLOV,
  MAKS_OPIS,
  MAKS_TACKA,
  NAJVISE_TACAKA,
  Sastanak,
  SastanakRequest,
  VrstaSastanka,
  VRSTE_SASTANKA,
} from '../sastanak-models';
import { SastanakService } from '../sastanak-service';
import {
  DANA_ZA_POZIV,
  NAJVISE_DANA_UNAPRED,
  najranijiDan,
  predlozenTermin,
  rokPoziva,
} from '../pravila-sastanka';

type Polje = 'zgradaId' | 'vrsta' | 'naslov' | 'pocetak' | 'lokacija' | 'opis' | 'tacke';

function razliciteOdluke(tacke: AbstractControl): ValidationErrors | null {
  const odluke = (tacke.value as { odlukaId: number | null }[])
    .map((t) => t.odlukaId)
    .filter((id) => id !== null);
  return new Set(odluke).size === odluke.length ? null : { isteOdluke: true };
}

@Component({
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    DatePickerModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
    TextareaModule,
  ],
  selector: 'app-forma-sastanka',
  styleUrl: './forma-sastanka.scss',
  templateUrl: './forma-sastanka.html',
})
export class FormaSastanka {
  private sastanakService = inject(SastanakService);
  private glasanjeService = inject(GlasanjeService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly id = input(undefined, { transform: idIzAdrese });
  protected readonly izmena = computed(() => this.id() !== undefined);
  protected readonly neispravanId = computed(() => {
    const id = this.id();
    return id !== undefined && !jeIspravanId(id);
  });
  protected readonly sastanak = this.sastanakService.sastanak(
    computed(() => (this.neispravanId() ? undefined : this.id())),
  );
  // Termin pre izmene: rok za poziv se proverava samo kad se termin promeni
  private readonly pocetni = signal<(Pick<Sastanak, 'vrsta' | 'hitno'> & { pocetak: Date }) | null>(
    null,
  );

  private readonly zgradeKorisnika = injectZgradeKorisnika();
  protected readonly ucitano = this.zgradeKorisnika.ucitano;
  protected readonly greskaUcitavanja = this.zgradeKorisnika.greska;
  // Upravnik zakazuje samo u zgradi kojom upravlja, admin u bilo kojoj
  protected readonly zgrade = computed(() => {
    const profil = this.zgradeKorisnika.profil;
    if (!profil.hasValue()) {
      return [];
    }
    const zgrada = profil.value().zgrada;
    return this.zgradeKorisnika.admin() ? this.zgradeKorisnika.zgrade() : zgrada ? [zgrada] : [];
  });

  protected readonly maksNaslov = MAKS_NASLOV;
  protected readonly maksOpis = MAKS_OPIS;
  protected readonly maksLokacija = MAKS_LOKACIJA;
  protected readonly maksTacka = MAKS_TACKA;
  protected readonly najviseTacaka = NAJVISE_TACAKA;
  protected readonly danaZaPoziv = DANA_ZA_POZIV;
  protected readonly najkasnije = zaDana(NAJVISE_DANA_UNAPRED);

  protected readonly vrste = Object.entries(VRSTE_SASTANKA).map(([value, vrsta]) => ({
    value: value as VrstaSastanka,
    ...vrsta,
  }));

  protected readonly greska = signal('');
  protected readonly slanje = signal(false);

  protected readonly forma = this.fb.group(
    {
      zgradaId: this.fb.control<number | null>(null, Validators.required),
      vrsta: this.fb.nonNullable.control<VrstaSastanka>('skupstina'),
      naslov: this.fb.nonNullable.control('', [
        Validators.required,
        Validators.pattern(NIJE_PRAZNO),
        Validators.maxLength(MAKS_NASLOV),
      ]),
      pocetak: this.fb.control<Date | null>(
        predlozenTermin('skupstina', false),
        Validators.required,
      ),
      hitno: this.fb.nonNullable.control(false),
      lokacija: this.fb.nonNullable.control('', [
        Validators.required,
        Validators.pattern(NIJE_PRAZNO),
        Validators.maxLength(MAKS_LOKACIJA),
      ]),
      opis: this.fb.nonNullable.control('', Validators.maxLength(MAKS_OPIS)),
      tacke: this.fb.array([this.novaTacka()], { validators: razliciteOdluke }),
    },
    { validators: rokPoziva(() => this.pocetni()) },
  );

  protected readonly vrsta = toSignal(this.forma.controls.vrsta.valueChanges, {
    initialValue: this.forma.controls.vrsta.value,
  });
  protected readonly hitno = toSignal(this.forma.controls.hitno.valueChanges, {
    initialValue: false,
  });
  private readonly zgradaId = toSignal(this.forma.controls.zgradaId.valueChanges, {
    initialValue: null,
  });
  protected readonly skupstina = computed(() => this.vrsta() === 'skupstina');
  protected readonly najranije = computed(() => najranijiDan(this.vrsta(), this.hitno()));

  // Odluke se vezuju samo uz skupštinu, i samo iz iste zgrade
  protected readonly odluke = this.glasanjeService.odlukeZgrade(
    computed(() => (this.skupstina() ? (this.zgradaId() ?? undefined) : undefined)),
  );
  protected readonly opcijeOdluka = computed(() =>
    (this.odluke.hasValue() ? this.odluke.value() : []).map((o) => ({
      id: o.id,
      naziv: o.zavrseno ? `${o.pitanje} (završeno)` : o.pitanje,
    })),
  );

  constructor() {
    effect(() => {
      const zgrade = this.zgrade();
      if (!this.izmena() && zgrade.length === 1 && this.forma.controls.zgradaId.value === null) {
        this.forma.controls.zgradaId.setValue(zgrade[0].id);
      }
    });

    // Dok korisnik sam ne izabere termin, predlažemo prvi dozvoljen dan prema vrsti
    effect(() => {
      const vrsta = this.vrsta();
      const hitno = this.hitno();
      const pocetak = this.forma.controls.pocetak;
      if (!this.izmena() && pocetak.pristine) {
        pocetak.setValue(predlozenTermin(vrsta, hitno));
      }
    });

    effect(() => {
      if (this.sastanak.hasValue()) {
        const s = this.sastanak.value();
        untracked(() => this.popuni(s));
      }
    });
  }

  private popuni(s: Sastanak): void {
    const pocetak = new Date(s.pocetak);
    this.pocetni.set({ vrsta: s.vrsta, hitno: s.hitno, pocetak });
    const tacke = this.forma.controls.tacke;
    tacke.clear();
    for (const t of s.tacke) {
      tacke.push(this.novaTacka(t.naslov, t.odluka?.id ?? null));
    }
    this.forma.controls.zgradaId.disable();
    this.forma.setValue({
      zgradaId: s.zgrada.id,
      vrsta: s.vrsta,
      naslov: s.naslov,
      pocetak,
      hitno: s.hitno,
      lokacija: s.lokacija,
      opis: s.opis ?? '',
      tacke: tacke.getRawValue(),
    });
  }

  private novaTacka(naslov = '', odlukaId: number | null = null) {
    return this.fb.group({
      naslov: this.fb.nonNullable.control(naslov, [
        Validators.required,
        Validators.pattern(NIJE_PRAZNO),
        Validators.maxLength(MAKS_TACKA),
      ]),
      odlukaId: this.fb.control<number | null>(odlukaId),
    });
  }

  protected get tacke() {
    return this.forma.controls.tacke;
  }

  protected dodajTacku(): void {
    this.tacke.push(this.novaTacka());
    this.fokusiraj(`#tacka-${this.tacke.length - 1}`);
  }

  protected ukloniTacku(i: number): void {
    this.tacke.removeAt(i);
    this.fokusiraj(`#tacka-${Math.min(i, this.tacke.length - 1)}`);
  }

  // Izabrana odluka popunjava praznu tačku svojim pitanjem
  protected izabranaOdluka(i: number, odlukaId: number | null): void {
    const naslov = this.tacke.at(i).controls.naslov;
    const odluka = this.odluke.value()?.find((o) => o.id === odlukaId);
    if (odluka && !naslov.value.trim()) {
      naslov.setValue(odluka.pitanje.slice(0, MAKS_TACKA));
    }
  }

  protected nevazece(polje: Polje): boolean {
    const kontrola = this.forma.controls[polje];
    return kontrola.invalid && kontrola.touched;
  }

  protected nevazecaTacka(i: number): boolean {
    const naslov = this.tacke.at(i).controls.naslov;
    return naslov.invalid && naslov.touched;
  }

  protected nevazeciTermin(): boolean {
    const pocetak = this.forma.controls.pocetak;
    return (
      pocetak.touched &&
      (pocetak.invalid || !!this.forma.errors?.['proslost'] || !!this.forma.errors?.['rokPoziva'])
    );
  }

  protected greskaTermina(): string {
    const pocetak = this.forma.controls.pocetak;
    if (pocetak.errors?.['server']) {
      return pocetak.errors['server'] as string;
    }
    if (this.forma.errors?.['rokPoziva']) {
      return `Skupština se zakazuje bar ${DANA_ZA_POZIV} dana unapred. Za kraći rok označi hitnu sednicu.`;
    }
    return this.forma.errors?.['proslost']
      ? 'Termin mora biti u budućnosti.'
      : 'Izaberi dan i vreme.';
  }

  protected greskaListeTacaka(): string | null {
    const greske = this.tacke.errors;
    if (!greske || !this.tacke.touched) {
      return null;
    }
    return (
      (greske['server'] as string | undefined) ??
      (greske['isteOdluke'] ? 'Ista odluka je uz više tačaka.' : null)
    );
  }

  protected async posalji(): Promise<void> {
    const { zgradaId, vrsta, naslov, pocetak, hitno, lokacija, opis, tacke } =
      this.forma.getRawValue();
    if (this.forma.invalid || zgradaId === null || pocetak === null) {
      this.forma.markAllAsTouched();
      this.fokusirajPrvoNevazece();
      return;
    }
    const skupstina = vrsta === 'skupstina';
    const podaci: SastanakRequest = {
      vrsta,
      naslov: naslov.trim(),
      opis: opis.trim(),
      pocetak,
      lokacija: lokacija.trim(),
      hitno: skupstina && hitno,
      tacke: tacke.map((t) => ({
        naslov: t.naslov.trim(),
        ...(skupstina && t.odlukaId !== null && { odlukaId: t.odlukaId }),
      })),
    };

    this.greska.set('');
    this.slanje.set(true);
    try {
      const id = this.id();
      const sastanak = await firstValueFrom(
        id === undefined
          ? this.sastanakService.zakazi({ ...podaci, opis: podaci.opis || undefined, zgradaId })
          : this.sastanakService.izmeni(id, podaci),
      );
      await this.router.navigate(['/sastanci', sastanak.id], {
        replaceUrl: id !== undefined,
        state: {
          poruka: {
            tip: 'uspeh',
            tekst:
              id === undefined
                ? 'Sastanak je zakazan. Poziv vide svi koji su pozvani.'
                : 'Izmene su sačuvane.',
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
    const neuspeh = this.izmena()
      ? 'Izmene nisu sačuvane. Pokušaj ponovo za nekoliko trenutaka.'
      : 'Sastanak nije zakazan. Pokušaj ponovo za nekoliko trenutaka.';
    if (!(err instanceof HttpErrorResponse)) {
      this.greska.set(neuspeh);
      return;
    }
    const tacka = this.tacke.controls.findIndex((_, i) => greskaPolja(err, `tacke.${i}.naslov`));
    if (tacka !== -1) {
      this.tacke
        .at(tacka)
        .controls.naslov.setErrors({ server: greskaPolja(err, `tacke.${tacka}.naslov`) });
      this.fokusirajPrvoNevazece();
      return;
    }
    for (const polje of ['vrsta', 'naslov', 'pocetak', 'lokacija', 'opis', 'tacke'] as const) {
      const poruka = greskaPolja(err, polje);
      if (poruka) {
        this.forma.controls[polje].setErrors({ server: poruka });
        this.forma.controls[polje].markAsTouched();
        this.fokusirajPrvoNevazece();
        return;
      }
    }
    this.greska.set(
      [403, 404, 409].includes(err.status) ? (porukaServera(err) ?? neuspeh) : neuspeh,
    );
  }

  private fokusirajPrvoNevazece(): void {
    const polja: Polje[] = ['zgradaId', 'vrsta', 'naslov', 'pocetak', 'lokacija', 'opis', 'tacke'];
    const prvo = polja.find(
      (polje) =>
        this.forma.controls[polje].invalid || (polje === 'pocetak' && this.nevazeciTermin()),
    );
    let selektor = prvo ? `#${prvo}` : null;
    if (prvo === 'tacke') {
      const i = this.tacke.controls.findIndex((t) => t.controls.naslov.invalid);
      selektor = i === -1 ? '#tacka-0' : `#tacka-${i}`;
    }
    if (selektor) {
      this.host.nativeElement.querySelector<HTMLElement>(selektor)?.focus();
    }
  }
}
