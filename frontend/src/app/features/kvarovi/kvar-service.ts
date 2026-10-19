import { inject, Service, Signal } from '@angular/core';
import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Stranica } from '../../shared/stranica';
import {
  KategorijaKvara,
  KomentarKvara,
  Kvar,
  KvarDetalj,
  PrijavaKvaraRequest,
  PrioritetKvara,
  SlikaKvara,
  StatusRadaServisera,
  UpitKvarova,
} from './kvar-models';
import { ZgradaOsnovno } from '../zgrade/zgrada-models';
import { KorisnikOsnovno } from '../auth/auth-models';

@Service()
export class KvarService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/kvar`;
  private komentariUrl = `${environment.apiUrl}/komentar-kvar`;
  private slikeUrl = `${environment.apiUrl}/slika-kvara`;

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

  prijavi(podaci: PrijavaKvaraRequest): Observable<Kvar> {
    return this.http.post<Kvar>(this.apiUrl, podaci);
  }

  nadjiKvar(id: number): Observable<KvarDetalj> {
    return this.http.get<KvarDetalj>(`${this.apiUrl}/${id}`);
  }

  prihvati(id: number): Observable<KvarDetalj> {
    return this.http.patch<KvarDetalj>(`${this.apiUrl}/${id}/prihvati`, null);
  }

  odbij(id: number): Observable<KvarDetalj> {
    return this.http.patch<KvarDetalj>(`${this.apiUrl}/${id}/odbij`, null);
  }

  postaviPrioritet(id: number, prioritet: PrioritetKvara): Observable<KvarDetalj> {
    return this.http.patch<KvarDetalj>(`${this.apiUrl}/${id}/prioritet`, { prioritet });
  }

  dodeliServisera(id: number, serviserId: number): Observable<KvarDetalj> {
    return this.http.patch<KvarDetalj>(`${this.apiUrl}/${id}/dodeli`, { serviserId });
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

  komentari(kvarId: number, poStrani: number, preId?: number): Observable<Stranica<KomentarKvara>> {
    let params = new HttpParams().set('poStrani', poStrani);
    if (preId) {
      params = params.set('preId', preId);
    }
    return this.http.get<Stranica<KomentarKvara>>(`${this.komentariUrl}/kvar/${kvarId}`, {
      params,
    });
  }

  dodajKomentar(kvarId: number, tekst: string): Observable<KomentarKvara> {
    return this.http.post<KomentarKvara>(this.komentariUrl, { kvarId, tekst });
  }

  obrisiKomentar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.komentariUrl}/${id}`);
  }

  vrati(id: number, tekst: string): Observable<KvarDetalj> {
    return this.http.patch<KvarDetalj>(`${this.apiUrl}/${id}/vrati`, { tekst });
  }

  slike(kvarId: number): Observable<SlikaKvara[]> {
    return this.http.get<SlikaKvara[]>(`${this.slikeUrl}/kvar/${kvarId}`);
  }

  dodajSliku(kvarId: number, slika: File): Observable<SlikaKvara> {
    const podaci = new FormData();
    podaci.append('slika', slika);
    return this.http.post<SlikaKvara>(`${this.slikeUrl}/kvar/${kvarId}`, podaci);
  }

  obrisiSliku(id: number): Observable<void> {
    return this.http.delete<void>(`${this.slikeUrl}/${id}`);
  }
}
