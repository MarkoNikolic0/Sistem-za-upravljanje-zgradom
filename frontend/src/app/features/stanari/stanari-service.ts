import { inject, Service, Signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StanSaStanarima, Stanar } from './stanari-models';

@Service()
export class StanariService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/zgrada`;

  private url(zgradaId: number, id?: number): string {
    const stanari = `${this.apiUrl}/${zgradaId}/stanar`;
    return id === undefined ? stanari : `${stanari}/${id}`;
  }

  stanovi(zgradaId: Signal<number | null>) {
    return httpResource<StanSaStanarima[]>(() => {
      const id = zgradaId();
      return id === null ? undefined : this.url(id);
    });
  }

  promeniVlasnika(
    zgradaId: number,
    id: number,
    vlasnik: boolean,
  ): Observable<Pick<Stanar, 'id' | 'vlasnik'>> {
    return this.http.patch<Pick<Stanar, 'id' | 'vlasnik'>>(this.url(zgradaId, id), { vlasnik });
  }

  odseli(zgradaId: number, id: number): Observable<void> {
    return this.http.delete<void>(this.url(zgradaId, id));
  }
}
