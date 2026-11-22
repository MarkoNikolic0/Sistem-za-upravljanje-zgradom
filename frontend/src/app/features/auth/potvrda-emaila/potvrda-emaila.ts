import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthLayout } from '../auth-layout/auth-layout';
import { AuthService } from '../auth-service';
import { porukaServera, PREVISE_POKUSAJA } from '../../../shared/forme/greske-servera';
import { fokusPosleCrtanja } from '../../../shared/fokus';
import { ispravanIdIzAdrese } from '../../../shared/ispravan-id';
import { povratakNaPovezivanje } from '../pristup/poziv-u-zgradu';

@Component({
  imports: [ButtonModule, MessageModule, RouterLink, AuthLayout],
  selector: 'app-potvrda-emaila',
  templateUrl: './potvrda-emaila.html',
})
export class PotvrdaEmaila {
  private authService = inject(AuthService);
  private router = inject(Router);
  private location = inject(Location);
  private readonly fokusiraj = fokusPosleCrtanja();

  private readonly adresa = inject(ActivatedRoute).snapshot.queryParamMap;
  protected readonly token = this.adresa.get('token');
  protected readonly povratak = povratakNaPovezivanje(
    ispravanIdIzAdrese(this.adresa.get('zgrada')),
  );

  protected readonly salje = signal(false);
  protected readonly greska = signal('');
  protected readonly aktiviran = signal(false);
  protected readonly linkNevazi = signal(false);

  constructor() {
    if (this.token) {
      // Token se skida iz adrese bez nove navigacije, da forma ne bi bila iscrtana ponovo
      this.location.replaceState(this.location.path().split('?')[0]);
    }
  }

  protected aktiviraj(): void {
    if (!this.token || this.salje()) {
      return;
    }

    this.greska.set('');
    this.salje.set(true);

    this.authService
      .potvrdiEmail(this.token)
      .pipe(finalize(() => this.salje.set(false)))
      .subscribe({
        next: () => {
          this.aktiviran.set(true);
          this.fokusiraj('#ishod');
        },
        error: (err: HttpErrorResponse) => this.obradiGresku(err),
      });
  }

  private obradiGresku(err: HttpErrorResponse): void {
    if (err.status === 400) {
      this.linkNevazi.set(true);
      this.fokusiraj('#ishod');
      return;
    }

    this.greska.set(
      err.status === 429
        ? (porukaServera(err) ?? PREVISE_POKUSAJA)
        : 'Nalog nije aktiviran. Pokušaj ponovo za nekoliko trenutaka.',
    );
  }
}
