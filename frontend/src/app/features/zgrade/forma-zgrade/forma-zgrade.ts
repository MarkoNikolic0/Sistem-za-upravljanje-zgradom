import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { oznaciGreskuPolja, porukaServera } from '../../../shared/greske-servera';
import { NIJE_PRAZNO } from '../../../shared/nije-prazno';
import { ZgradaOsnovno } from '../zgrada-models';
import { ZgradaService } from '../zgrada-service';

const MAKS_NAZIVA = 100;
const MAKS_ADRESE = 200;
const POLJA = ['naziv', 'adresa'] as const;

@Component({
  selector: 'app-forma-zgrade',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, MessageModule],
  templateUrl: './forma-zgrade.html',
})
export class FormaZgrade implements OnInit {
  private fb = inject(FormBuilder);
  private zgradaService = inject(ZgradaService);
  private readonly fokusiraj = fokusPosleCrtanja();

  readonly zgrada = input<ZgradaOsnovno>();
  readonly sacuvana = output<ZgradaOsnovno>();
  readonly odustani = output<void>();
  // Zgrada je u međuvremenu obrisana: stranica vodi na listu
  readonly obrisana = output<void>();

  protected readonly maksNaziva = MAKS_NAZIVA;
  protected readonly maksAdrese = MAKS_ADRESE;
  protected readonly slanje = signal(false);
  protected readonly greska = signal('');

  protected readonly forma = this.fb.nonNullable.group({
    naziv: [
      '',
      [Validators.required, Validators.pattern(NIJE_PRAZNO), Validators.maxLength(MAKS_NAZIVA)],
    ],
    adresa: [
      '',
      [Validators.required, Validators.pattern(NIJE_PRAZNO), Validators.maxLength(MAKS_ADRESE)],
    ],
  });

  ngOnInit(): void {
    const zgrada = this.zgrada();
    if (zgrada) {
      this.forma.setValue({ naziv: zgrada.naziv, adresa: zgrada.adresa });
    }
    this.fokusiraj('#zgrada-naziv');
  }

  protected nevazece(polje: (typeof POLJA)[number]): boolean {
    const kontrola = this.forma.controls[polje];
    return kontrola.invalid && kontrola.touched;
  }

  protected async sacuvaj(): Promise<void> {
    if (this.forma.invalid) {
      this.forma.markAllAsTouched();
      this.fokusiraj('input.ng-invalid');
      return;
    }
    const { naziv, adresa } = this.forma.getRawValue();
    const podaci = { naziv: naziv.trim(), adresa: adresa.trim() };
    const zgrada = this.zgrada();
    this.greska.set('');
    this.slanje.set(true);
    try {
      this.sacuvana.emit(
        await firstValueFrom(
          zgrada ? this.zgradaService.izmeni(zgrada.id, podaci) : this.zgradaService.dodaj(podaci),
        ),
      );
    } catch (err) {
      this.obradiGresku(err);
    } finally {
      this.slanje.set(false);
    }
  }

  private obradiGresku(err: unknown): void {
    const neuspeh = 'Zgrada nije sačuvana. Pokušaj ponovo za nekoliko trenutaka.';
    if (!(err instanceof HttpErrorResponse)) {
      this.greska.set(neuspeh);
      return;
    }
    const polje = oznaciGreskuPolja(err, this.forma.controls, POLJA);
    if (polje) {
      this.fokusiraj(`#zgrada-${polje}`);
      return;
    }
    if (err.status === 404 && this.zgrada()) {
      this.obrisana.emit();
      return;
    }
    this.greska.set(err.status === 403 ? (porukaServera(err) ?? neuspeh) : neuspeh);
    this.fokusiraj('#greska-zgrade');
  }
}
