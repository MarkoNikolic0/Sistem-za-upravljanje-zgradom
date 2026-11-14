import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Stranica } from '../../shared/liste/stranica';
import { NeprocitaneNotifikacije, Notifikacija, TipNotifikacije } from './notifikacija-models';

export const NOTIFIKACIJA_PO_STRANI = 20;

@Service()
export class NotifikacijaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/notifikacija`;

  notifikacije(samoNeprocitane: boolean, preId?: number): Observable<Stranica<Notifikacija>> {
    let params = new HttpParams().set('poStrani', NOTIFIKACIJA_PO_STRANI);
    if (samoNeprocitane) {
      params = params.set('neprocitane', true);
    }
    if (preId) {
      params = params.set('preId', preId);
    }
    return this.http.get<Stranica<Notifikacija>>(this.apiUrl, { params });
  }

  neprocitane(): Observable<NeprocitaneNotifikacije> {
    return this.http
      .get<{
        broj: number;
        linkovi: { link: string; broj: number; tip: TipNotifikacije }[];
      }>(`${this.apiUrl}/broj-neprocitanih`)
      .pipe(
        map(({ broj, linkovi }) => ({
          broj,
          linkovi: Object.fromEntries(linkovi.map(({ link, broj, tip }) => [link, { broj, tip }])),
        })),
      );
  }

  procitaj(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/procitano`, null);
  }

  procitajStranicu(link: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/procitano`, { link });
  }

  procitajSve(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/procitano`, null);
  }
}
