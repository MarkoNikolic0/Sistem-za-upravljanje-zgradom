import { inject, Service } from '@angular/core';
import { AuthService } from '../auth-service';
import { AuthStore } from './auth-store';
import { finalize, map, Observable, shareReplay, tap } from 'rxjs';

@Service()
export class TokenRefresh {
  private authService = inject(AuthService);
  private authStore = inject(AuthStore);

  private uToku$: Observable<string> | null = null;

  osvezi(): Observable<string> {
    this.uToku$ ??= this.authService.refresh().pipe(
      map(({ accessToken }) => accessToken),
      tap({
        next: (token) => this.authStore.postaviToken(token),
        error: () => this.authStore.ocistiSesiju(),
      }),
      finalize(() => (this.uToku$ = null)),
      shareReplay(1),
    );
    return this.uToku$;
  }
}
