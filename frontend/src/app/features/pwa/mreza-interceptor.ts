import { HttpErrorResponse, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { StanjeMreze } from './stanje-mreze';

const BEZ_VEZE = [0, 504];

export const mrezaInterceptor: HttpInterceptorFn = (req, next) => {
  const stanjeMreze = inject(StanjeMreze);
  return next(req).pipe(
    tap({
      next: (dogadjaj) => {
        if (dogadjaj.type === HttpEventType.Response) {
          stanjeMreze.serverOdgovara();
        }
      },
      error: (greska: unknown) => {
        if (!(greska instanceof HttpErrorResponse)) {
          return;
        }
        if (BEZ_VEZE.includes(greska.status)) {
          stanjeMreze.serverNedostupan();
        } else {
          stanjeMreze.serverOdgovara();
        }
      },
    }),
  );
};
