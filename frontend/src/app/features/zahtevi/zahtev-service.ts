import { inject, Service } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateZahtevRequest, ZahtevResponse } from './zahtev-models';

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
}