import { Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, Observable, of } from 'rxjs';

export function poZgradama<T>(
  zgradeId: Signal<number[]>,
  ucitaj: (zgradaId: number) => Observable<T>,
) {
  return rxResource({
    params: () => (zgradeId().length > 0 ? zgradeId() : undefined),
    stream: ({ params }) =>
      forkJoin(params.map((id) => ucitaj(id).pipe(catchError(() => of(null))))),
  });
}
