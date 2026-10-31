import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { greskaPolja, porukaServera } from '../../../shared/greske-servera';
import { NIJE_PRAZNO } from '../../../shared/nije-prazno';
import { formatirajTelefon } from '../../../shared/telefon';
import { KontaktRequest, KontaktZgrade, PREDLOZI_ULOGA } from '../kontakt-models';
import { KontaktService } from '../kontakt-service';

const MAKS_NAZIVA = 100;
const MAKS_ULOGE = 60;
const POLJA = ['naziv', 'uloga', 'telefon'] as const;
type Polje = (typeof POLJA)[number];

@Component({
  selector: 'app-forma-kontakta',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, MessageModule],
  templateUrl: './forma-kontakta.html',
  styleUrl: './forma-kontakta.scss',
})
export class FormaKontakta implements OnInit {
  private fb = inject(FormBuilder);
  private kontaktService = inject(KontaktService);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly zgradaId = input.required<number>();
  readonly kontakt = input<KontaktZgrade>();
  // Upravnik sam sebe dodaje kao kontakt (ne prikazuje se automatski)
  readonly ja = input<KontaktRequest>();

  readonly sacuvan = output<KontaktZgrade>();
  readonly odustani = output<void>();
  // Kontakt je u međuvremenu obrisan ili je zgrada popunjena: stranica osvežava listu
  readonly zastarelo = output<string>();

  protected readonly maksNaziva = MAKS_NAZIVA;
  protected readonly maksUloge = MAKS_ULOGE;
  protected readonly predlozi = PREDLOZI_ULOGA;
  protected readonly slanje = signal(false);
  protected readonly greska = signal('');

  protected readonly forma = this.fb.nonNullable.group({
    naziv: [
      '',
      [Validators.required, Validators.pattern(NIJE_PRAZNO), Validators.maxLength(MAKS_NAZIVA)],
    ],
    uloga: [
      '',
      [Validators.required, Validators.pattern(NIJE_PRAZNO), Validators.maxLength(MAKS_ULOGE)],
    ],
    telefon: ['', Validators.required],
  });

  ngOnInit(): void {
    const kontakt = this.kontakt();
    if (kontakt) {
      this.forma.setValue({
        naziv: kontakt.naziv,
        uloga: kontakt.uloga,
        telefon: formatirajTelefon(kontakt.telefon),
      });
    }
    this.fokusiraj('#kontakt-naziv');
  }

  protected nevazece(polje: Polje): boolean {
    const kontrola = this.forma.controls[polje];
    return kontrola.invalid && kontrola.touched;
  }

  protected izaberiUlogu(uloga: string): void {
    this.forma.controls.uloga.setValue(uloga);
    this.forma.controls.uloga.markAsTouched();
  }

  protected popuniMene(): void {
    const ja = this.ja();
    if (ja) {
      this.forma.setValue({ ...ja, telefon: formatirajTelefon(ja.telefon) });
      this.fokusiraj('#kontakt-telefon');
    }
  }

  protected async sacuvaj(): Promise<void> {
    if (this.forma.invalid) {
      this.forma.markAllAsTouched();
      this.fokusiraj('input.ng-invalid');
      return;
    }
    const { naziv, uloga, telefon } = this.forma.getRawValue();
    const podaci = { naziv: naziv.trim(), uloga: uloga.trim(), telefon };
    const kontakt = this.kontakt();
    this.greska.set('');
    this.slanje.set(true);
    try {
      this.sacuvan.emit(
        await firstValueFrom(
          kontakt
            ? this.kontaktService.izmeni(this.zgradaId(), kontakt.id, podaci)
            : this.kontaktService.dodaj(this.zgradaId(), podaci),
        ),
      );
    } catch (err) {
      this.obradiGresku(err);
    } finally {
      this.slanje.set(false);
    }
  }

  private obradiGresku(err: unknown): void {
    const neuspeh = 'Kontakt nije sačuvan. Pokušaj ponovo za nekoliko trenutaka.';
    if (!(err instanceof HttpErrorResponse)) {
      this.greska.set(neuspeh);
      return;
    }
    for (const polje of POLJA) {
      const poruka = greskaPolja(err, polje);
      if (poruka) {
        this.forma.controls[polje].setErrors({ server: poruka });
        this.forma.controls[polje].markAsTouched();
        this.fokusiraj(`#kontakt-${polje}`);
        return;
      }
    }
    if (err.status === 404 && this.kontakt()) {
      this.zastarelo.emit('Kontakt je u međuvremenu obrisan.');
      return;
    }
    if (err.status === 409) {
      this.zastarelo.emit(porukaServera(err) ?? neuspeh);
      return;
    }
    this.greska.set(err.status === 403 ? (porukaServera(err) ?? neuspeh) : neuspeh);
    this.fokusiraj('#greska-kontakta');
  }
}
