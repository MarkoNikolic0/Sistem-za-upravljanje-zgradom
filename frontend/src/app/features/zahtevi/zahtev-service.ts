import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateZahtevRequest,
  ObradaZahtevaRequest,
  StranicaZahteva,
  UpitZahteva,
  ZahtevResponse,
  ZahtevUpravnika,
} from './zahtev-models';

@Service()
export class ZahtevService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/zahtev-povezivanje`;

  mojiZahtevi() {
    return httpResource<ZahtevResponse[]>(() => `${this.apiUrl}/moji-zahtevi`, {
      defaultValue: [],
    });
  }

  posalji(podaci: CreateZahtevRequest): Observable<ZahtevResponse> {
    return this.http.post<ZahtevResponse>(this.apiUrl, podaci);
  }

  zahteviZaObradu(upit: UpitZahteva): Observable<StranicaZahteva> {
    let params = new HttpParams().set('strana', upit.strana).set('poStrani', upit.poStrani);
    if (upit.status) {
      params = params.set('status', upit.status);
    }
    return this.http.get<StranicaZahteva>(this.apiUrl, { params });
  }

  obradi(id: number, podaci: ObradaZahtevaRequest): Observable<ZahtevUpravnika> {
    return this.http.patch<ZahtevUpravnika>(`${this.apiUrl}/${id}/obradjen`, podaci);
  }
}
