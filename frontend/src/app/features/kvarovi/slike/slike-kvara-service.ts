import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SlikaKvara } from '../kvar-models';

@Service()
export class SlikaKvaraService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/slika-kvara`;

  slike(kvarId: number): Observable<SlikaKvara[]> {
    return this.http.get<SlikaKvara[]>(`${this.apiUrl}/kvar/${kvarId}`);
  }

  dodaj(kvarId: number, slika: File): Observable<SlikaKvara> {
    const podaci = new FormData();
    podaci.append('slika', slika);
    return this.http.post<SlikaKvara>(`${this.apiUrl}/kvar/${kvarId}`, podaci);
  }

  obrisi(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
