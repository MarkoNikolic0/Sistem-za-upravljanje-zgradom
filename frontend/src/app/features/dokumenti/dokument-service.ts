import { inject, Service, Signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Stranica } from '../../shared/liste/stranica';
import {
  DOKUMENATA_NA_POCETNOJ,
  DOKUMENATA_PO_STRANI,
  DokumentRequest,
  DokumentZgrade,
  KategorijaDokumenta,
} from './dokument-models';

export interface UpitDokumenata {
  zgradaId: number;
  kategorija: KategorijaDokumenta | null;
  strana: number;
}

@Service()
export class DokumentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/zgrada`;

  private url(zgradaId: number, id?: number): string {
    const dokumenti = `${this.apiUrl}/${zgradaId}/dokument`;
    return id === undefined ? dokumenti : `${dokumenti}/${id}`;
  }

  dokumenti(upit: Signal<UpitDokumenata | null>) {
    return httpResource<Stranica<DokumentZgrade>>(() => {
      const u = upit();
      if (u === null) {
        return undefined;
      }
      return {
        url: this.url(u.zgradaId),
        params: {
          strana: u.strana,
          poStrani: DOKUMENATA_PO_STRANI,
          ...(u.kategorija && { kategorija: u.kategorija }),
        },
      };
    });
  }

  najnovijiZgrada(zgradeId: Signal<number[]>) {
    return rxResource({
      params: () => (zgradeId().length > 0 ? zgradeId() : undefined),
      stream: ({ params }) =>
        forkJoin(
          params.map((id) =>
            this.http
              .get<Stranica<DokumentZgrade>>(this.url(id), {
                params: { poStrani: DOKUMENATA_NA_POCETNOJ },
              })
              .pipe(catchError(() => of(null))),
          ),
        ),
    });
  }

  dodaj(zgradaId: number, podaci: DokumentRequest, fajl: File): Observable<DokumentZgrade> {
    const forma = new FormData();
    forma.append('naziv', podaci.naziv);
    forma.append('kategorija', podaci.kategorija);
    forma.append('samoVlasnici', String(podaci.samoVlasnici));
    forma.append('fajl', fajl);
    return this.http.post<DokumentZgrade>(this.url(zgradaId), forma);
  }

  izmeni(zgradaId: number, id: number, podaci: DokumentRequest): Observable<DokumentZgrade> {
    return this.http.patch<DokumentZgrade>(this.url(zgradaId, id), podaci);
  }

  obrisi(zgradaId: number, id: number): Observable<void> {
    return this.http.delete<void>(this.url(zgradaId, id));
  }
}
