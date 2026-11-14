import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthLayout } from '../auth-layout/auth-layout';
import { AuthService } from '../auth-service';
import { porukaServera, PREVISE_POKUSAJA } from '../../../shared/forme/greske-servera';
import { fokusPosleCrtanja } from '../../../shared/fokus';

@Component({
  imports: [ButtonModule, MessageModule, RouterLink, AuthLayout],
  selector: 'app-potvrda-emaila',
  templateUrl: './potvrda-emaila.html',
})
export class PotvrdaEmaila {
  private authService = inject(AuthService);
  private router = inject(Router);
  private readonly fokusiraj = fokusPosleCrtanja();

  protected readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

  protected readonly salje = signal(false);
  protected readonly greska = signal('');
  protected readonly aktiviran = signal(false);
  protected readonly linkNevazi = signal(false);

  constructor() {
    if (this.token) {
      void this.router.navigate([], { replaceUrl: true });
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
