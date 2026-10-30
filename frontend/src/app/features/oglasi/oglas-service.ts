import { inject, Service, Signal } from '@angular/core';
import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Stranica } from '../../shared/stranica';
import { NoviOglasRequest, Oglas, OglasRequest, PrilogOglasa, UpitOglasa } from './oglas-models';

@Service()
export class OglasService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/oglas`;

  lista(upit: UpitOglasa): Observable<Stranica<Oglas>> {
    let params = new HttpParams().set('strana', upit.strana).set('poStrani', upit.poStrani);
    if (upit.vrsta !== null) {
      params = params.set('vrsta', upit.vrsta);
    }
    if (upit.zgradaId !== null) {
      params = params.set('zgradaId', upit.zgradaId);
    }
    return this.http.get<Stranica<Oglas>>(this.apiUrl, { params });
  }

  // Zakačena obaveštenja pa najnoviji oglasi (početna)
  najnoviji(broj: number) {
    return httpResource<Stranica<Oglas>>(() => ({
      url: this.apiUrl,
      params: { strana: 1, poStrani: broj },
    }));
  }

  oglas(id: Signal<number | undefined>) {
    return httpResource<Oglas>(() => {
      const oglasId = id();
      return oglasId === undefined ? undefined : `${this.apiUrl}/${oglasId}`;
    });
  }

  objavi(podaci: NoviOglasRequest): Observable<Oglas> {
    return this.http.post<Oglas>(this.apiUrl, podaci);
  }

  izmeni(id: number, podaci: OglasRequest): Observable<Oglas> {
    return this.http.patch<Oglas>(`${this.apiUrl}/${id}`, podaci);
  }

  obrisi(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  sakrij(id: number, razlog: string): Observable<Oglas> {
    return this.http.patch<Oglas>(`${this.apiUrl}/${id}/sakrij`, { razlog });
  }

  obnovi(id: number): Observable<Oglas> {
    return this.http.patch<Oglas>(`${this.apiUrl}/${id}/obnovi`, null);
  }

  dodajPrilog(id: number, prilog: File): Observable<PrilogOglasa> {
    const podaci = new FormData();
    podaci.append('prilog', prilog);
    return this.http.post<PrilogOglasa>(`${this.apiUrl}/${id}/prilog`, podaci);
  }

  obrisiPrilog(id: number, prilogId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/prilog/${prilogId}`);
  }
}
