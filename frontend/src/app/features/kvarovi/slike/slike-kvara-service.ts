import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SlikaKvara } from '../kvar-models';

@Service()
export class SlikaKvaraService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/kvar`;

  slike(kvarId: number): Observable<SlikaKvara[]> {
    return this.http.get<SlikaKvara[]>(`${this.apiUrl}/${kvarId}/slika`);
  }

  dodaj(kvarId: number, slika: File): Observable<SlikaKvara> {
    const podaci = new FormData();
    podaci.append('slika', slika);
    return this.http.post<SlikaKvara>(`${this.apiUrl}/${kvarId}/slika`, podaci);
  }

  obrisi(kvarId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${kvarId}/slika/${id}`);
  }
}
