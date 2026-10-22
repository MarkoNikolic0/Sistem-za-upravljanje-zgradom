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
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { greskaPolja, porukaServera } from '../../../shared/greske-servera';
import { jeIspravanId } from '../../../shared/ispravan-id';
import { NIJE_PRAZNO } from '../../../shared/nije-prazno';
import {
  MAKS_NASLOV_OGLASA,
  MAKS_TEKST_OGLASA,
  StanjeNavigacijeOglasa,
  VRSTE_OGLASA,
  VrstaOglasa,
} from '../oglas-models';
import { OglasService } from '../oglas-service';
import { upravljaZgradom } from '../pravila-oglasa';
import { injectZgradeOglasa } from '../zgrade-oglasa';

type Polje = 'zgradaId' | 'vrsta' | 'naslov' | 'tekst';

@Component({
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
    TextareaModule,
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

  private readonly zgradeOglasa = injectZgradeOglasa();
  protected readonly profil = this.zgradeOglasa.profil;
  protected readonly zgrade = this.zgradeOglasa.zgrade;

  protected readonly ucitano = this.zgradeOglasa.ucitano;
  protected readonly greskaUcitavanja = this.zgradeOglasa.greska;

  protected readonly maksNaslov = MAKS_NASLOV_OGLASA;
  protected readonly maksTekst = MAKS_TEKST_OGLASA;

  protected readonly greska = signal('');
  protected readonly slanje = signal(false);

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
        const { zgrada, vrsta, naslov, tekst } = this.oglas.value();
        untracked(() => this.forma.setValue({ zgradaId: zgrada.id, vrsta, naslov, tekst }));
      }
    });

    effect(() => {
      const dozvoljene = this.vrste().map((v) => v.value);
      const vrsta = untracked(this.vrsta);
      if (vrsta !== null && this.profil.hasValue() && !dozvoljene.includes(vrsta)) {
        this.forma.controls.vrsta.setValue(null);
      }
    });
  }

  protected nevazece(polje: Polje): boolean {
    const kontrola = this.forma.controls[polje];
    return kontrola.invalid && kontrola.touched;
  }

  protected async posalji(): Promise<void> {
    const { zgradaId, vrsta, naslov, tekst } = this.forma.getRawValue();
    if (this.forma.invalid || zgradaId === null || vrsta === null) {
      this.forma.markAllAsTouched();
      this.fokusirajPrvoNevazece();
      return;
    }

    const podaci = { vrsta, naslov: naslov.trim(), tekst: tekst.trim() };
    const id = this.id();
    this.greska.set('');
    this.slanje.set(true);
    try {
      if (id === undefined) {
        await firstValueFrom(this.oglasService.objavi({ ...podaci, zgradaId }));
      } else {
        await firstValueFrom(this.oglasService.izmeni(id, podaci));
      }
      await this.router.navigate(['/oglasi'], {
        state: {
          poruka: {
            tip: 'uspeh',
            tekst: id === undefined ? 'Oglas je objavljen.' : 'Oglas je izmenjen.',
          },
        } satisfies StanjeNavigacijeOglasa,
      });
    } catch (err) {
      this.obradiGresku(err);
    } finally {
      this.slanje.set(false);
    }
  }

  private obradiGresku(err: unknown): void {
    const neuspeh = this.izmena()
      ? 'Oglas nije izmenjen. Pokušaj ponovo za nekoliko trenutaka.'
      : 'Oglas nije objavljen. Pokušaj ponovo za nekoliko trenutaka.';
    if (!(err instanceof HttpErrorResponse)) {
      this.greska.set(neuspeh);
      return;
    }
    for (const polje of ['vrsta', 'naslov', 'tekst'] as const) {
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
    const polja: Polje[] = ['zgradaId', 'vrsta', 'naslov', 'tekst'];
    const prvo = polja.find((polje) => this.forma.controls[polje].invalid);
    if (prvo) {
      this.host.nativeElement.querySelector<HTMLElement>(`#${prvo}`)?.focus();
    }
  }
}
