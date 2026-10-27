import { inject, Service, Signal } from '@angular/core';
import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin, map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Stranica } from '../../shared/stranica';
import { Glasanje, NovoGlasanjeRequest, UpitGlasanja } from './glasanje-models';

// Najviše koliko server vraća na jednoj strani
const NAJVISE_ODLUKA = 50;

@Service()
export class GlasanjeService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/glasanje`;

  lista(upit: UpitGlasanja): Observable<Stranica<Glasanje>> {
    let params = new HttpParams()
      .set('stanje', upit.stanje)
      .set('strana', upit.strana)
      .set('poStrani', upit.poStrani);
    if (upit.zgradaId !== null) {
      params = params.set('zgradaId', upit.zgradaId);
    }
    return this.http.get<Stranica<Glasanje>>(this.apiUrl, { params });
  }

  glasanje(id: Signal<number | undefined>) {
    return httpResource<Glasanje>(() => {
      const glasanjeId = id();
      return glasanjeId === undefined ? undefined : `${this.apiUrl}/${glasanjeId}`;
    });
  }

  // Odluke zgrade, aktivne i završene, za izbor uz tačku dnevnog reda sastanka
  odlukeZgrade(zgradaId: Signal<number | undefined>) {
    return rxResource({
      params: zgradaId,
      stream: ({ params }) =>
        forkJoin(
          (['aktivna', 'zavrsena'] as const).map((stanje) =>
            this.lista({ stanje, zgradaId: params, strana: 1, poStrani: NAJVISE_ODLUKA }),
          ),
        ).pipe(
          map((strane) => strane.flatMap((s) => s.stavke).filter((g) => g.vrsta === 'odluka')),
        ),
    });
  }

  napravi(podaci: NovoGlasanjeRequest): Observable<Glasanje> {
    return this.http.post<Glasanje>(this.apiUrl, podaci);
  }

  glasaj(id: number, opcijaId: number): Observable<Glasanje> {
    return this.http.put<Glasanje>(`${this.apiUrl}/${id}/glas`, { opcijaId });
  }

  povuciGlas(id: number): Observable<Glasanje> {
    return this.http.delete<Glasanje>(`${this.apiUrl}/${id}/glas`);
  }

  zatvori(id: number): Observable<Glasanje> {
    return this.http.patch<Glasanje>(`${this.apiUrl}/${id}/zatvori`, null);
  }

  obrisi(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
