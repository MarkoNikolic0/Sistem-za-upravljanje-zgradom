import { Service, signal, Signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StanOsnovno, ZgradaOsnovno } from './zgrada-models';

@Service()
export class ZgradaService {
  private apiUrl = environment.apiUrl;

  zgrade(ucitaj: Signal<boolean> = signal(true)) {
    return httpResource<ZgradaOsnovno[]>(() => (ucitaj() ? `${this.apiUrl}/zgrada` : undefined), {
      defaultValue: [],
    });
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
}
