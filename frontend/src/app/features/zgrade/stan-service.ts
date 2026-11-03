import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StanOsnovno, StanRequest } from './zgrada-models';

@Service()
export class StanService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/stan`;

  dodaj(zgradaId: number, stan: StanRequest): Observable<StanOsnovno> {
    return this.http.post<StanOsnovno>(this.apiUrl, { zgradaId, ...stan });
  }

  dodajVise(zgradaId: number, stanovi: StanRequest[]): Observable<StanOsnovno[]> {
    return this.http.post<StanOsnovno[]>(`${this.apiUrl}/grupno`, { zgradaId, stanovi });
  }

  izmeni(id: number, stan: StanRequest): Observable<StanOsnovno> {
    return this.http.patch<StanOsnovno>(`${this.apiUrl}/${id}`, stan);
  }

  obrisi(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
