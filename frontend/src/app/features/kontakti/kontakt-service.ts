import { inject, Service, Signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { KontaktRequest, KontaktZgrade } from './kontakt-models';

@Service()
export class KontaktService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/zgrada`;

  private url(zgradaId: number, id?: number): string {
    const kontakti = `${this.apiUrl}/${zgradaId}/kontakt`;
    return id === undefined ? kontakti : `${kontakti}/${id}`;
  }

  kontakti(zgradaId: Signal<number | null>) {
    return httpResource<KontaktZgrade[]>(() => {
      const id = zgradaId();
      return id === null ? undefined : this.url(id);
    });
  }

  // Početna: kontakti svih zgrada korisnika, istim redom kao zgrade; zgrada koja ne stigne je null
  kontaktiZgrada(zgradeId: Signal<number[]>) {
    return rxResource({
      params: () => (zgradeId().length > 0 ? zgradeId() : undefined),
      stream: ({ params }) =>
        forkJoin(
          params.map((id) =>
            this.http.get<KontaktZgrade[]>(this.url(id)).pipe(catchError(() => of(null))),
          ),
        ),
    });
  }

  dodaj(zgradaId: number, podaci: KontaktRequest): Observable<KontaktZgrade> {
    return this.http.post<KontaktZgrade>(this.url(zgradaId), podaci);
  }

  izmeni(zgradaId: number, id: number, podaci: KontaktRequest): Observable<KontaktZgrade> {
    return this.http.patch<KontaktZgrade>(this.url(zgradaId, id), podaci);
  }

  obrisi(zgradaId: number, id: number): Observable<void> {
    return this.http.delete<void>(this.url(zgradaId, id));
  }
}
