import { inject, Service, Signal } from '@angular/core';
import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Stranica } from '../../shared/liste/stranica';
import {
  NoviSastanakRequest,
  PregledPrisustva,
  Sastanak,
  SastanakRequest,
  SpisakPrisustva,
  UpitSastanaka,
} from './sastanak-models';

@Service()
export class SastanakService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/sastanak`;

  lista(upit: UpitSastanaka): Observable<Stranica<Sastanak>> {
    let params = new HttpParams()
      .set('stanje', upit.stanje)
      .set('strana', upit.strana)
      .set('poStrani', upit.poStrani);
    if (upit.zgradaId !== null) {
      params = params.set('zgradaId', upit.zgradaId);
    }
    return this.http.get<Stranica<Sastanak>>(this.apiUrl, { params });
  }

  predstojeci(broj: number) {
    return httpResource<Stranica<Sastanak>>(() => ({
      url: this.apiUrl,
      params: { stanje: 'predstojeci', otkazani: false, strana: 1, poStrani: broj },
    }));
  }

  sastanak(id: Signal<number | undefined>) {
    return httpResource<Sastanak>(() => {
      const sastanakId = id();
      return sastanakId === undefined ? undefined : `${this.apiUrl}/${sastanakId}`;
    });
  }

  zakazi(podaci: NoviSastanakRequest): Observable<Sastanak> {
    return this.http.post<Sastanak>(this.apiUrl, podaci);
  }

  izmeni(id: number, podaci: SastanakRequest): Observable<Sastanak> {
    return this.http.patch<Sastanak>(`${this.apiUrl}/${id}`, podaci);
  }

  otkazi(id: number, razlog: string): Observable<Sastanak> {
    return this.http.patch<Sastanak>(`${this.apiUrl}/${id}/otkazi`, { razlog });
  }

  najavi(id: number, dolazi: boolean): Observable<PregledPrisustva> {
    return this.http.put<PregledPrisustva>(`${this.apiUrl}/${id}/najava`, { dolazi });
  }

  povuciNajavu(id: number): Observable<PregledPrisustva> {
    return this.http.delete<PregledPrisustva>(`${this.apiUrl}/${id}/najava`);
  }

  spisak(id: Signal<number | undefined>) {
    return httpResource<SpisakPrisustva>(() => {
      const sastanakId = id();
      return sastanakId === undefined ? undefined : `${this.apiUrl}/${sastanakId}/prisustvo`;
    });
  }

  evidentiraj(id: number, stanovi: number[]): Observable<SpisakPrisustva> {
    return this.http.put<SpisakPrisustva>(`${this.apiUrl}/${id}/prisustvo`, { stanovi });
  }
}
