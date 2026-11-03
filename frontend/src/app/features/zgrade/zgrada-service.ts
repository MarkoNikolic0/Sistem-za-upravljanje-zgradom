import { inject, Service, signal, Signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PregledZgrade,
  StanOsnovno,
  UpravnikZgrade,
  ZgradaOsnovno,
  ZgradaRequest,
  ZgradaSaBrojevima,
} from './zgrada-models';

@Service()
export class ZgradaService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  zgrade(ucitaj: Signal<boolean> = signal(true)) {
    return httpResource<ZgradaOsnovno[]>(() => (ucitaj() ? `${this.apiUrl}/zgrada` : undefined), {
      defaultValue: [],
    });
  }

  zgradeSaBrojevima() {
    return httpResource<ZgradaSaBrojevima[]>(() => `${this.apiUrl}/zgrada/upravljanje`);
  }

  zgrada(id: Signal<number | undefined>) {
    return httpResource<ZgradaOsnovno>(() => {
      const zgradaId = id();
      return zgradaId === undefined ? undefined : `${this.apiUrl}/zgrada/${zgradaId}`;
    });
  }

  pregled(ucitaj: Signal<boolean> = signal(true)) {
    return httpResource<PregledZgrade[]>(() =>
      ucitaj() ? `${this.apiUrl}/zgrada/pregled` : undefined,
    );
  }

  stanovi(zgradaId: Signal<number | null>) {
    return httpResource<StanOsnovno[]>(
      () => {
        const id = zgradaId();
        return id === null ? undefined : `${this.apiUrl}/stan/zgrada/${id}`;
      },
      { defaultValue: [] },
    );
  }

  dodaj(podaci: ZgradaRequest): Observable<ZgradaOsnovno> {
    return this.http.post<ZgradaOsnovno>(`${this.apiUrl}/zgrada`, podaci);
  }

  izmeni(id: number, podaci: ZgradaRequest): Observable<ZgradaOsnovno> {
    return this.http.patch<ZgradaOsnovno>(`${this.apiUrl}/zgrada/${id}`, podaci);
  }

  obrisi(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/zgrada/${id}`);
  }

  arhiviraj(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/zgrada/${id}/arhiva`, null);
  }

  vratiIzArhive(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/zgrada/${id}/arhiva`);
  }

  upravnik(zgradaId: Signal<number | undefined>) {
    return httpResource<UpravnikZgrade>(() => {
      const id = zgradaId();
      return id === undefined ? undefined : `${this.apiUrl}/zgrada/${id}/upravnik`;
    });
  }

  postaviUpravnika(zgradaId: number, korisnikId: number): Observable<UpravnikZgrade> {
    return this.http.put<UpravnikZgrade>(`${this.apiUrl}/zgrada/${zgradaId}/upravnik`, {
      korisnikId,
    });
  }

  razresiUpravnika(zgradaId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/zgrada/${zgradaId}/upravnik`);
  }
}
