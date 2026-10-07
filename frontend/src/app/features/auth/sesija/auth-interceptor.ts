import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthStore } from './auth-store';
import { TokenRefresh } from './token-refresh';

// Rute koje rade preko kolacica ili bez prijave, pa im Bearer token ne treba
const BEZ_TOKENA = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].map(
  (putanja) => `${environment.apiUrl}${putanja}`,
);

function saTokenom(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl) || BEZ_TOKENA.includes(req.url)) {
    return next(req);
  }

  const authStore = inject(AuthStore);
  const tokenRefresh = inject(TokenRefresh);
  const router = inject(Router);

  const token = authStore.accessToken();

  return next(token ? saTokenom(req, token) : req).pipe(
    catchError((greska: unknown) => {
      if (!(greska instanceof HttpErrorResponse) || greska.status !== 401) {
        return throwError(() => greska);
      }

      return tokenRefresh.osvezi().pipe(
        catchError((greskaRefresha: unknown) => {
          void router.navigateByUrl('/login');
          return throwError(() => greskaRefresha);
        }),
        switchMap((noviToken) => next(saTokenom(req, noviToken))),
      );
    }),
  );
};