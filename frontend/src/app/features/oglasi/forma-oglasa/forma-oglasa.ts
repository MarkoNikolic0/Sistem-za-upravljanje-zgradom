import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  numberAttribute,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { greskaPolja, porukaServera } from '../../../shared/greske-servera';
import { jeIspravanId } from '../../../shared/ispravan-id';
import { NIJE_PRAZNO } from '../../../shared/nije-prazno';
import { OglasService } from '../oglas-service';
import { MAKS_NASLOV_OGLASA, MAKS_TEKST_OGLASA, VRSTE_OGLASA, VrstaOglasa } from '../oglas-models';
import { PRAVILA_PRILOGA, predlozenRok } from '../pravila-oglasa';
import { injectZgradeKorisnika, upravljaZgradom } from '../../zgrade/zgrade-korisnika';
import { krajDana, rokNijeProsao } from '../../../shared/datum';
import { StanjeNavigacije } from '../../../shared/poruka';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { IzabraniFajlovi } from '../../../shared/izabrani-fajlovi/izabrani-fajlovi';
import { PriloziOglasa } from '../prilozi-oglasa/prilozi-oglasa';
import { fokusPosleCrtanja } from '../../../shared/fokus';

type Polje = 'zgradaId' | 'vrsta' | 'naslov' | 'tekst' | 'vaziDo';

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
    IzabraniFajlovi,
    PriloziOglasa,
  ],
  selector: 'app-forma-oglasa',
  styleUrl: './forma-oglasa.scss',
  templateUrl: './forma-oglasa.html',
})
export class FormaOglasa {
  private oglasService = inject(OglasService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly id = input(undefined, {
    transform: (id: string | undefined) => (id === undefined ? undefined : numberAttribute(id)),
  });
  protected readonly izmena = computed(() => this.id() !== undefined);
  protected readonly neispravanId = computed(() => {
    const id = this.id();
    return id !== undefined && !jeIspravanId(id);
  });
  protected readonly oglas = this.oglasService.oglas(
    computed(() => (this.neispravanId() ? undefined : this.id())),
  );

  private readonly zgradeOglasa = injectZgradeKorisnika();
  protected readonly profil = this.zgradeOglasa.profil;
  protected readonly zgrade = this.zgradeOglasa.zgrade;

  protected readonly ucitano = this.zgradeOglasa.ucitano;
  protected readonly greskaUcitavanja = this.zgradeOglasa.greska;

  protected readonly maksNaslov = MAKS_NASLOV_OGLASA;
  protected readonly maksTekst = MAKS_TEKST_OGLASA;

  protected readonly danas = new Date();
  protected readonly greska = signal('');
  protected readonly slanje = signal(false);

  // Prilozi se dodaju i uklanjaju tek kad se oglas sačuva
  protected readonly pravilaPriloga = PRAVILA_PRILOGA;
  protected readonly noviPrilozi = signal<File[]>([]);
  private readonly uklonjeniPrilozi = signal<number[]>([]);
  protected readonly postojeciPrilozi = computed(() => {
    const uklonjeni = this.uklonjeniPrilozi();
    return this.oglas.hasValue()
      ? this.oglas.value().prilozi.filter((prilog) => !uklonjeni.includes(prilog.id))
      : [];
  });

  protected readonly forma = this.fb.group({
    zgradaId: this.fb.control<number | null>(null, Validators.required),
    vrsta: this.fb.control<VrstaOglasa | null>(null, Validators.required),
    naslov: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(NIJE_PRAZNO),
      Validators.maxLength(MAKS_NASLOV_OGLASA),
    ]),
    tekst: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(NIJE_PRAZNO),
      Validators.maxLength(MAKS_TEKST_OGLASA),
    ]),
    vaziDo: this.fb.control<Date | null>(null, rokNijeProsao),
    vazno: this.fb.nonNullable.control(false),
  });

  private readonly zgradaId = toSignal(this.forma.controls.zgradaId.valueChanges, {
    initialValue: null,
  });
  private readonly vrsta = toSignal(this.forma.controls.vrsta.valueChanges, {
    initialValue: null,
  });

  // Obaveštenje nudimo samo upravniku izabrane zgrade i adminu
  protected readonly vrste = computed(() => {
    const smeObavestenje =
      this.profil.hasValue() && upravljaZgradom(this.profil.value(), this.zgradaId());
    return Object.entries(VRSTE_OGLASA)
      .filter(([vrsta]) => vrsta !== 'obavestenje' || smeObavestenje)
      .map(([value, opis]) => ({ value: value as VrstaOglasa, label: opis.naziv }));
  });

  protected readonly pomocTeksta = computed(() => {
    const vrsta = this.vrsta();
    return vrsta
      ? VRSTE_OGLASA[vrsta].pomoc
      : 'Izaberi vrstu, pa napiši šta komšije treba da znaju.';
  });

  protected readonly imaStan = computed(
    () => this.profil.hasValue() && this.profil.value().stanovi.length > 0,
  );

  constructor() {
    effect(() => {
      const zgrade = this.zgrade();
      if (!this.izmena() && zgrade.length === 1 && this.forma.controls.zgradaId.value === null) {
        this.forma.controls.zgradaId.setValue(zgrade[0].id);
      }
    });

    effect(() => {
      if (this.oglas.hasValue()) {
        const { zgrada, vrsta, naslov, tekst, vaziDo, vazno } = this.oglas.value();
        untracked(() =>
          this.forma.setValue({
            zgradaId: zgrada.id,
            vrsta,
            naslov,
            tekst,
            vaziDo: vaziDo ? new Date(vaziDo) : null,
            vazno,
          }),
        );
      }
    });

    effect(() => {
      const dozvoljene = this.vrste().map((v) => v.value);
      const vrsta = untracked(this.vrsta);
      if (vrsta !== null && this.profil.hasValue() && !dozvoljene.includes(vrsta)) {
        this.forma.controls.vrsta.setValue(null);
      }
    });

    // Dok korisnik sam ne izabere rok, predlažemo ga prema vrsti
    effect(() => {
      const vrsta = this.vrsta();
      const vaziDo = this.forma.controls.vaziDo;
      if (!this.izmena() && vaziDo.pristine) {
        vaziDo.setValue(predlozenRok(vrsta));
      }
    });
  }

  protected ukloniPostojeci(prilogId: number): void {
    this.uklonjeniPrilozi.update((uklonjeni) => [...uklonjeni, prilogId]);
    this.fokusiraj('app-izbor-fajlova button');
  }

  protected nevazece(polje: Polje): boolean {
    const kontrola = this.forma.controls[polje];
    return kontrola.invalid && kontrola.touched;
  }

  protected async posalji(): Promise<void> {
    const { zgradaId, vrsta, naslov, tekst, vaziDo, vazno } = this.forma.getRawValue();
    if (this.forma.invalid || zgradaId === null || vrsta === null) {
      this.forma.markAllAsTouched();
      this.fokusirajPrvoNevazece();
      return;
    }

    const podaci = {
      vrsta,
      naslov: naslov.trim(),
      tekst: tekst.trim(),
      vazno,
      vaziDo: vaziDo && krajDana(vaziDo),
    };
    const id = this.id();
    this.greska.set('');
    this.slanje.set(true);
    try {
      const oglasId =
        id === undefined
          ? (await firstValueFrom(this.oglasService.objavi({ ...podaci, zgradaId }))).id
          : (await firstValueFrom(this.oglasService.izmeni(id, podaci))).id;
      const { nisuSacuvani, ukupno } = await this.sacuvajPriloge(oglasId);
      const uradjeno = id === undefined ? 'Oglas je objavljen' : 'Oglas je izmenjen';
      await this.router.navigate(['/oglasi'], {
        state: {
          poruka:
            nisuSacuvani > 0
              ? {
                  tip: 'greska',
                  tekst: `${uradjeno}, ali neki prilozi nisu sačuvani (${nisuSacuvani} od ${ukupno}). Pokušaj ponovo u izmeni oglasa.`,
                }
              : { tip: 'uspeh', tekst: `${uradjeno}.` },
        } satisfies StanjeNavigacije,
      });
    } catch (err) {
      this.obradiGresku(err);
    } finally {
      this.slanje.set(false);
    }
  }

  // Prvo uklanjanje, da bi se oslobodilo mesto za nove priloge
  private async sacuvajPriloge(oglasId: number) {
    const promene: (() => Observable<unknown>)[] = [
      ...this.uklonjeniPrilozi().map(
        (prilogId) => () => this.oglasService.obrisiPrilog(oglasId, prilogId),
      ),
      ...this.noviPrilozi().map((fajl) => () => this.oglasService.dodajPrilog(oglasId, fajl)),
    ];
    let nisuSacuvani = 0;
    for (const promena of promene) {
      try {
        await firstValueFrom(promena());
      } catch {
        nisuSacuvani++;
      }
    }
    return { nisuSacuvani, ukupno: promene.length };
  }

  private obradiGresku(err: unknown): void {
    const neuspeh = this.izmena()
      ? 'Oglas nije izmenjen. Pokušaj ponovo za nekoliko trenutaka.'
      : 'Oglas nije objavljen. Pokušaj ponovo za nekoliko trenutaka.';
    if (!(err instanceof HttpErrorResponse)) {
      this.greska.set(neuspeh);
      return;
    }
    for (const polje of ['vrsta', 'naslov', 'tekst', 'vaziDo'] as const) {
      const poruka = greskaPolja(err, polje);
      if (poruka) {
        this.forma.controls[polje].setErrors({ server: poruka });
        this.fokusirajPrvoNevazece();
        return;
      }
    }
    this.greska.set(
      err.status === 403 || err.status === 409 ? (porukaServera(err) ?? neuspeh) : neuspeh,
    );
  }

  private fokusirajPrvoNevazece(): void {
    const polja: Polje[] = ['zgradaId', 'vrsta', 'naslov', 'tekst', 'vaziDo'];
    const prvo = polja.find((polje) => this.forma.controls[polje].invalid);
    if (prvo) {
      this.host.nativeElement.querySelector<HTMLElement>(`#${prvo}`)?.focus();
    }
  }
}
