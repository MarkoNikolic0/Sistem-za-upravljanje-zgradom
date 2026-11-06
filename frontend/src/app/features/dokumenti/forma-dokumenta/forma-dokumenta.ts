import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import {
  greskaPolja,
  oznaciGreskuPolja,
  porukaServera,
} from '../../../shared/forme/greske-servera';
import { NIJE_PRAZNO } from '../../../shared/forme/nije-prazno';
import { jeSlika, velicinaFajla } from '../../../shared/fajlovi/fajlovi';
import { IzborFajlova } from '../../../shared/fajlovi/izbor-fajlova/izbor-fajlova';
import {
  DokumentZgrade,
  KATEGORIJE_DOKUMENATA,
  KategorijaDokumenta,
  MAKS_NAZIVA_DOKUMENTA,
  opisKategorije,
  PRAVILA_DOKUMENTA,
} from '../dokument-models';
import { DokumentService } from '../dokument-service';

const POLJA = ['naziv', 'kategorija', 'samoVlasnici'] as const;

function nazivIzFajla(ime: string): string {
  return Array.from(
    ime
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim(),
  )
    .slice(0, MAKS_NAZIVA_DOKUMENTA)
    .join('');
}

@Component({
  selector: 'app-forma-dokumenta',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, MessageModule, IzborFajlova],
  templateUrl: './forma-dokumenta.html',
  styleUrl: './forma-dokumenta.scss',
})
export class FormaDokumenta implements OnInit {
  private fb = inject(FormBuilder);
  private dokumentService = inject(DokumentService);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly zgradaId = input.required<number>();
  readonly dokument = input<DokumentZgrade>();
  readonly kategorija = input<KategorijaDokumenta | null>(null);

  readonly sacuvan = output<DokumentZgrade>();
  readonly odustani = output<void>();
  readonly zastarelo = output<string>();

  protected readonly kategorije = KATEGORIJE_DOKUMENATA;
  protected readonly pravila = PRAVILA_DOKUMENTA;
  protected readonly maksNaziva = MAKS_NAZIVA_DOKUMENTA;
  protected readonly jeSlika = jeSlika;
  protected readonly fajl = signal<File | null>(null);
  protected readonly greskaFajla = signal('');
  protected readonly slanje = signal(false);
  protected readonly greska = signal('');
  private predlogNaziva = '';

  protected readonly forma = this.fb.group({
    naziv: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(NIJE_PRAZNO),
      Validators.maxLength(MAKS_NAZIVA_DOKUMENTA),
    ]),
    kategorija: this.fb.control<KategorijaDokumenta | null>(null, Validators.required),
    samoVlasnici: this.fb.nonNullable.control(false),
  });

  constructor() {
    this.forma.controls.kategorija.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((kategorija) => {
        const vidljivost = this.forma.controls.samoVlasnici;
        if (kategorija && !vidljivost.dirty) {
          vidljivost.setValue(opisKategorije(kategorija).samoVlasnici);
        }
      });
  }

  ngOnInit(): void {
    const dokument = this.dokument();
    if (dokument) {
      this.forma.setValue({
        naziv: dokument.naziv,
        kategorija: dokument.kategorija,
        samoVlasnici: dokument.samoVlasnici,
      });
      this.forma.controls.samoVlasnici.markAsDirty();
      this.fokusiraj('#dokument-naziv');
    } else {
      this.forma.controls.kategorija.setValue(this.kategorija());
      this.fokusiraj('app-izbor-fajlova button');
    }
  }

  protected nevazece(polje: (typeof POLJA)[number]): boolean {
    const kontrola = this.forma.controls[polje];
    return kontrola.invalid && kontrola.touched;
  }

  protected opisFajla(fajl: File): string {
    return `${jeSlika(fajl.type) ? 'Slika' : 'PDF'}, ${velicinaFajla(fajl.size)}`;
  }

  protected izaberi([fajl]: File[]): void {
    this.fajl.set(fajl);
    this.greskaFajla.set('');
    const naziv = this.forma.controls.naziv;
    if (!naziv.value.trim() || naziv.value === this.predlogNaziva) {
      this.predlogNaziva = nazivIzFajla(fajl.name);
      naziv.setValue(this.predlogNaziva);
    }
  }

  protected odbijen(greska: string): void {
    this.greskaFajla.set(greska);
  }

  protected async sacuvaj(): Promise<void> {
    const dokument = this.dokument();
    const fajl = this.fajl();
    if (!dokument && !fajl) {
      this.greskaFajla.set('Izaberi fajl.');
    }
    if (this.forma.invalid || (!dokument && !fajl)) {
      this.forma.markAllAsTouched();
      this.fokusirajPrvuGresku();
      return;
    }
    const { naziv, kategorija, samoVlasnici } = this.forma.getRawValue();
    const podaci = { naziv: naziv.trim(), kategorija: kategorija!, samoVlasnici };
    this.greska.set('');
    this.slanje.set(true);
    try {
      this.sacuvan.emit(
        await firstValueFrom(
          dokument
            ? this.dokumentService.izmeni(this.zgradaId(), dokument.id, podaci)
            : this.dokumentService.dodaj(this.zgradaId(), podaci, fajl!),
        ),
      );
    } catch (err) {
      this.obradiGresku(err);
    } finally {
      this.slanje.set(false);
    }
  }

  private fokusirajPrvuGresku(): void {
    if (this.greskaFajla()) {
      this.fokusiraj('app-izbor-fajlova button');
    } else if (this.forma.controls.naziv.invalid) {
      this.fokusiraj('#dokument-naziv');
    } else {
      this.fokusiraj('#dokument-kategorija');
    }
  }

  private obradiGresku(err: unknown): void {
    const neuspeh = 'Dokument nije sačuvan. Pokušaj ponovo za nekoliko trenutaka.';
    if (!(err instanceof HttpErrorResponse)) {
      this.greska.set(neuspeh);
      return;
    }
    const zaFajl =
      greskaPolja(err, 'fajl') ?? (err.status === 413 ? 'Fajl je veći od 10 MB.' : undefined);
    if (zaFajl) {
      this.greskaFajla.set(zaFajl);
      this.fokusiraj('app-izbor-fajlova button');
      return;
    }
    if (oznaciGreskuPolja(err, this.forma.controls, POLJA)) {
      this.fokusirajPrvuGresku();
      return;
    }
    if (err.status === 404) {
      this.zastarelo.emit(
        this.dokument()
          ? 'Dokument više ne postoji ili zgrada više nije u aplikaciji.'
          : 'Zgrada više nije u aplikaciji.',
      );
      return;
    }
    this.greska.set(err.status === 403 ? (porukaServera(err) ?? neuspeh) : neuspeh);
    this.fokusiraj('#greska-dokumenta');
  }
}
