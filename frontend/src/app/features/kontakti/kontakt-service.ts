import { inject, Service, Signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { KontaktRequest, KontaktZgrade } from './kontakt-models';

@Service()
export class KontaktService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/zgrada`;

  kontakti(zgradaId: Signal<number | null>) {
    return httpResource<KontaktZgrade[]>(() => {
      const id = zgradaId();
      return id === null ? undefined : `${this.apiUrl}/${id}/kontakt`;
    });
  }

  kontaktiZgrada(zgradeId: Signal<number[]>) {
    return rxResource({
      params: () => (zgradeId().length > 0 ? zgradeId() : undefined),
      stream: ({ params }) =>
        forkJoin(
          params.map((id) => this.http.get<KontaktZgrade[]>(`${this.apiUrl}/${id}/kontakt`)),
        ),
    });
  }

  dodaj(zgradaId: number, podaci: KontaktRequest): Observable<KontaktZgrade> {
    return this.http.post<KontaktZgrade>(`${this.apiUrl}/${zgradaId}/kontakt`, podaci);
  }

  izmeni(zgradaId: number, id: number, podaci: KontaktRequest): Observable<KontaktZgrade> {
    return this.http.patch<KontaktZgrade>(`${this.apiUrl}/${zgradaId}/kontakt/${id}`, podaci);
  }

  obrisi(zgradaId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${zgradaId}/kontakt/${id}`);
  }
}
