import { Component, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputPasswordModule } from 'primeng/inputpassword';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../auth/auth-service';
import { MIN_DUZINA_LOZINKE, PRAVILA_LOZINKE } from '../../auth/pravila-lozinke';
import { greskaPolja } from '../../../shared/greske-servera';

type Polje = 'trenutnaLozinka' | 'novaLozinka';

@Component({
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputPasswordModule,
    MessageModule,
  ],
  selector: 'app-change-password',
  templateUrl: './change-password.html',
})
export class ChangePassword {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly minDuzinaLozinke = MIN_DUZINA_LOZINKE;

  protected readonly otvoreno = signal(false);
  protected readonly salje = signal(false);
  protected readonly greska = signal('');
  protected readonly promenjena = signal(false);
  protected readonly sakrijTrenutnu = signal(true);
  protected readonly sakrijNovu = signal(true);

  protected readonly forma = this.fb.nonNullable.group({
    trenutnaLozinka: ['', Validators.required],
    novaLozinka: ['', PRAVILA_LOZINKE],
  });

  nevazece(polje: Polje): boolean {
    const kontrola = this.forma.controls[polje];
    return kontrola.invalid && kontrola.touched;
  }

  otvori(): void {
    this.forma.reset();
    this.sakrijTrenutnu.set(true);
    this.sakrijNovu.set(true);
    this.greska.set('');
    this.promenjena.set(false);
    this.otvoreno.set(true);
  }

  otkazi(): void {
    this.otvoreno.set(false);
  }

  sacuvaj(): void {
    if (this.forma.invalid) {
      this.forma.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('input.ng-invalid')?.focus();
      return;
    }

    this.greska.set('');
    this.salje.set(true);

    this.authService
      .changePassword(this.forma.getRawValue())
      .pipe(finalize(() => this.salje.set(false)))
      .subscribe({
        next: () => {
          this.otvoreno.set(false);
          this.promenjena.set(true);
        },
        error: (err: HttpErrorResponse) => this.obradiGresku(err),
      });
  }

  private obradiGresku(err: HttpErrorResponse): void {
    for (const polje of ['trenutnaLozinka', 'novaLozinka'] as const) {
      const poruka = greskaPolja(err, polje);
      if (poruka) {
        const kontrola = this.forma.controls[polje];
        kontrola.setErrors({ server: poruka });
        kontrola.markAsTouched();
        this.host.nativeElement.querySelector<HTMLElement>(`#${polje}`)?.focus();
        return;
      }
    }

    this.greska.set('Lozinka nije promenjena. Pokušaj ponovo za nekoliko trenutaka.');
  }
}
