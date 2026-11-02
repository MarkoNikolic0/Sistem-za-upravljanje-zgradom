import { Service, Signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { StanSaStanarima } from './stanari-models';

@Service()
export class StanariService {
  private apiUrl = `${environment.apiUrl}/zgrada`;

  stanovi(zgradaId: Signal<number | null>) {
    return httpResource<StanSaStanarima[]>(() => {
      const id = zgradaId();
      return id === null ? undefined : `${this.apiUrl}/${id}/stanar`;
    });
  }
}
