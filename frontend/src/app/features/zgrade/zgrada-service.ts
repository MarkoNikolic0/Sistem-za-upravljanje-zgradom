import { Service, Signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StanOsnovno, ZgradaOsnovno } from './zgrada-models';

@Service()
export class ZgradaService {
  private apiUrl = environment.apiUrl;

  zgrade() {
    return httpResource<ZgradaOsnovno[]>(() => `${this.apiUrl}/zgrada`, {
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