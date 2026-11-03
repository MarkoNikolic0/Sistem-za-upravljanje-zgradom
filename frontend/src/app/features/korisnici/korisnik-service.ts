import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Uloga } from '../auth/auth-models';
import { KategorijaKvara } from '../kvarovi/kvar-models';
import { Stranica } from '../../shared/liste/stranica';
import {
  DodeljivaUloga,
  KorisnikPretrage,
  KorisnikSistema,
  UpitKorisnika,
} from './korisnik-models';

@Service()
export class KorisnikService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/korisnik`;

  lista({ pretraga, uloga, ...upit }: UpitKorisnika): Observable<Stranica<KorisnikSistema>> {
    let params = new HttpParams({ fromObject: { ...upit } });
    if (pretraga) {
      params = params.set('pretraga', pretraga);
    }
    if (uloga) {
      params = params.set('uloga', uloga);
    }
    return this.http.get<Stranica<KorisnikSistema>>(this.apiUrl, { params });
  }

  pretrazi(pretraga: string, uloge: Uloga[] = []): Observable<KorisnikPretrage[]> {
    const params = new HttpParams({ fromObject: { pretraga, uloga: uloge } });
    return this.http
      .get<Stranica<KorisnikPretrage>>(this.apiUrl, { params })
      .pipe(map(({ stavke }) => stavke));
  }

  promeniUlogu(id: number, uloga: DodeljivaUloga): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/uloga`, { uloga });
  }

  deaktiviraj(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/deaktivacija`, null);
  }

  aktiviraj(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/deaktivacija`);
  }

  postaviSpecijalnosti(
    id: number,
    kategorije: KategorijaKvara[],
  ): Observable<{ kategorije: KategorijaKvara[] }> {
    return this.http.put<{ kategorije: KategorijaKvara[] }>(`${this.apiUrl}/${id}/specijalnosti`, {
      kategorije,
    });
  }
}
