import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Stranica } from '../../shared/stranica';
import { Kvar, PrijavaKvaraRequest, UpitKvarova } from './kvar-models';

@Service()
export class KvarService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/kvar`;

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
}
