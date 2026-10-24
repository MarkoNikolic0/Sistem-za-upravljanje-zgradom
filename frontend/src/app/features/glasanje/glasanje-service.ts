import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Stranica } from '../../shared/stranica';
import { Glasanje, NovaAnketaRequest, UpitGlasanja } from './glasanje-models';

@Service()
export class GlasanjeService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/glasanje`;

  lista(upit: UpitGlasanja): Observable<Stranica<Glasanje>> {
    let params = new HttpParams()
      .set('stanje', upit.stanje)
      .set('strana', upit.strana)
      .set('poStrani', upit.poStrani);
    if (upit.zgradaId !== null) {
      params = params.set('zgradaId', upit.zgradaId);
    }
    return this.http.get<Stranica<Glasanje>>(this.apiUrl, { params });
  }

  napravi(podaci: NovaAnketaRequest): Observable<Glasanje> {
    return this.http.post<Glasanje>(this.apiUrl, podaci);
  }

  glasaj(id: number, opcijaId: number): Observable<Glasanje> {
    return this.http.put<Glasanje>(`${this.apiUrl}/${id}/glas`, { opcijaId });
  }

  povuciGlas(id: number): Observable<Glasanje> {
    return this.http.delete<Glasanje>(`${this.apiUrl}/${id}/glas`);
  }

  zatvori(id: number): Observable<Glasanje> {
    return this.http.patch<Glasanje>(`${this.apiUrl}/${id}/zatvori`, null);
  }

  obrisi(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
