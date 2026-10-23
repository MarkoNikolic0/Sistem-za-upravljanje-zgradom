import { inject, Service, Signal } from '@angular/core';
import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Stranica } from '../../shared/stranica';
import {
  KategorijaKvara,
  Kvar,
  KvarDetalj,
  PrijavaKvaraRequest,
  PrioritetKvara,
  StatusRadaServisera,
  UpitKvarova,
  SlicanKvar,
  StanjePracenja,
  UpitSlicnih,
} from './kvar-models';
import { ZgradaOsnovno } from '../zgrade/zgrada-models';
import { KorisnikOsnovno } from '../auth/auth-models';

@Service()
export class KvarService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/kvar`;

  lista(upit: UpitKvarova): Observable<Stranica<Kvar>> {
    let params = new HttpParams()
      .set('stanje', upit.stanje)
      .set('strana', upit.strana)
      .set('poStrani', upit.poStrani);
    if (upit.zgradaId !== null) {
      params = params.set('zgradaId', upit.zgradaId);
    }
    return this.http.get<Stranica<Kvar>>(this.apiUrl, { params });
  }

  zgradeSaKvarovima(ucitaj: Signal<boolean>) {
    return httpResource<ZgradaOsnovno[]>(() => (ucitaj() ? `${this.apiUrl}/zgrade` : undefined), {
      defaultValue: [],
    });
  }

  serviseri(kategorija: Signal<KategorijaKvara | undefined>) {
    return httpResource<KorisnikOsnovno[]>(
      () => {
        const k = kategorija();
        return k ? `${this.apiUrl}/serviseri/${k}` : undefined;
      },
      { defaultValue: [] },
    );
  }

  slicni(upit: Signal<UpitSlicnih | undefined>) {
    return httpResource<SlicanKvar[]>(
      () => {
        const u = upit();
        return u ? { url: `${this.apiUrl}/slicni`, params: { ...u } } : undefined;
      },
      { defaultValue: [] },
    );
  }

  prati(kvarId: number): Observable<StanjePracenja> {
    return this.http.put<StanjePracenja>(`${this.apiUrl}/${kvarId}/pracenje`, null);
  }

  prestaniPracenje(kvarId: number): Observable<StanjePracenja> {
    return this.http.delete<StanjePracenja>(`${this.apiUrl}/${kvarId}/pracenje`);
  }

  prijavi(podaci: PrijavaKvaraRequest): Observable<Kvar> {
    return this.http.post<Kvar>(this.apiUrl, podaci);
  }

  nadjiKvar(id: number): Observable<KvarDetalj> {
    return this.http.get<KvarDetalj>(`${this.apiUrl}/${id}`);
  }

  prihvati(id: number): Observable<KvarDetalj> {
    return this.http.patch<KvarDetalj>(`${this.apiUrl}/${id}/prihvati`, null);
  }

  odbij(id: number, tekst: string): Observable<KvarDetalj> {
    return this.http.patch<KvarDetalj>(`${this.apiUrl}/${id}/odbij`, { tekst });
  }

  povuci(id: number, tekst: string): Observable<KvarDetalj> {
    return this.http.patch<KvarDetalj>(`${this.apiUrl}/${id}/povuci`, tekst ? { tekst } : {});
  }

  postaviPrioritet(id: number, prioritet: PrioritetKvara): Observable<KvarDetalj> {
    return this.http.patch<KvarDetalj>(`${this.apiUrl}/${id}/prioritet`, { prioritet });
  }

  dodeliServisera(id: number, serviserId: number): Observable<KvarDetalj> {
    return this.http.patch<KvarDetalj>(`${this.apiUrl}/${id}/dodeli`, { serviserId });
  }

  postaviDolazak(id: number, dolazak: Date | null): Observable<KvarDetalj> {
    return this.http.patch<KvarDetalj>(`${this.apiUrl}/${id}/dolazak`, { dolazak });
  }

  promeniStatus(id: number, status: StatusRadaServisera): Observable<KvarDetalj> {
    return this.http.patch<KvarDetalj>(`${this.apiUrl}/${id}/status`, { status });
  }

  potvrdi(id: number): Observable<KvarDetalj> {
    return this.http.patch<KvarDetalj>(`${this.apiUrl}/${id}/potvrdi`, null);
  }

  zatvori(id: number): Observable<KvarDetalj> {
    return this.http.patch<KvarDetalj>(`${this.apiUrl}/${id}/zatvori`, null);
  }

  vrati(id: number, tekst: string): Observable<KvarDetalj> {
    return this.http.patch<KvarDetalj>(`${this.apiUrl}/${id}/vrati`, { tekst });
  }
}
