import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Uloga } from '../auth/auth-models';
import { KorisnikPretrage } from './korisnik-models';

@Service()
export class KorisnikService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/korisnik`;

  pretrazi(pretraga: string, uloge: Uloga[] = []): Observable<KorisnikPretrage[]> {
    const params = new HttpParams({ fromObject: { pretraga, uloga: uloge } });
    return this.http.get<KorisnikPretrage[]>(this.apiUrl, { params });
  }
}
