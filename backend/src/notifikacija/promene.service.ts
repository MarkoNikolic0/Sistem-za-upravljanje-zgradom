import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { NotifikacijaGateway } from './notifikacija.gateway.js';

export type VrstaPromene = 'glasanje' | 'sastanak' | 'kvar' | 'oglas';

export interface Promena {
  vrsta: VrstaPromene;
  id: number;
}

@Injectable()
export class PromeneService {
  private readonly logger = new Logger(PromeneService.name);

  constructor(
    private dataSource: DataSource,
    private gateway: NotifikacijaGateway,
  ) {}

  javi(
    promena: Promena,
    primaoci: (manager: EntityManager) => Promise<number[]>,
    bez: number[],
  ) {
    void primaoci(this.dataSource.manager)
      .then((korisnici) =>
        this.gateway.javiPromenu(
          korisnici.filter((id) => !bez.includes(id)),
          promena,
        ),
      )
      .catch((greska: unknown) =>
        this.logger.error('Signal promene nije poslat.', greska),
      );
  }
}
