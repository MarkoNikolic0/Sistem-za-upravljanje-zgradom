import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Stranica } from '../../../shared/stranica';
import { KomentarKvara } from '../kvar-models';

@Service()
export class KomentariKvaraService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/komentar-kvar`;

  komentari(kvarId: number, poStrani: number, preId?: number): Observable<Stranica<KomentarKvara>> {
    let params = new HttpParams().set('poStrani', poStrani);
    if (preId) {
      params = params.set('preId', preId);
    }
    return this.http.get<Stranica<KomentarKvara>>(`${this.apiUrl}/kvar/${kvarId}`, { params });
  }

  dodaj(kvarId: number, tekst: string): Observable<KomentarKvara> {
    return this.http.post<KomentarKvara>(this.apiUrl, { kvarId, tekst });
  }

  obrisi(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
