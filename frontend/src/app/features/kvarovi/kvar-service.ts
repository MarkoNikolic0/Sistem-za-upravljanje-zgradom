import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Stranica } from '../../shared/stranica';
import { KomentarKvara, Kvar, PrijavaKvaraRequest, UpitKvarova } from './kvar-models';

@Service()
export class KvarService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/kvar`;
  private komentariUrl = `${environment.apiUrl}/komentar-kvar`;

  lista(upit: UpitKvarova): Observable<Stranica<Kvar>> {
    const params = new HttpParams()
      .set('stanje', upit.stanje)
      .set('strana', upit.strana)
      .set('poStrani', upit.poStrani);
    return this.http.get<Stranica<Kvar>>(this.apiUrl, { params });
  }

  prijavi(podaci: PrijavaKvaraRequest): Observable<Kvar> {
    return this.http.post<Kvar>(this.apiUrl, podaci);
  }

  nadjiKvar(id: number): Observable<Kvar> {
    return this.http.get<Kvar>(`${this.apiUrl}/${id}`);
  }

  komentari(kvarId: number, poStrani: number, preId?: number): Observable<Stranica<KomentarKvara>> {
    let params = new HttpParams().set('poStrani', poStrani);
    if (preId) {
      params = params.set('preId', preId);
    }
    return this.http.get<Stranica<KomentarKvara>>(`${this.komentariUrl}/kvar/${kvarId}`, {
      params,
    });
  }

  dodajKomentar(kvarId: number, tekst: string): Observable<KomentarKvara> {
    return this.http.post<KomentarKvara>(this.komentariUrl, { kvarId, tekst });
  }

  obrisiKomentar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.komentariUrl}/${id}`);
  }
}
