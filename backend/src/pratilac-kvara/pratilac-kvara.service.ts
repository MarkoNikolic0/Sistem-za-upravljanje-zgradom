import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PratilacKvara } from './pratilac-kvara.entity.js';
import { KvarService } from '../kvar/kvar.service.js';
import { KvarPravaService } from '../kvar/kvar-prava.service.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { OTVORENI_STATUSI } from '../kvar/kvar.constants.js';
import { Kvar } from '../kvar/kvar.entity.js';

@Injectable()
export class PratilacKvaraService {
  constructor(
    @InjectRepository(PratilacKvara)
    private pratilacRepository: Repository<PratilacKvara>,
    private kvarService: KvarService,
    private kvarPravaService: KvarPravaService,
    private dataSource: DataSource,
  ) {}

  async prati(kvarId: number, korisnikId: number, uloga: Uloga) {
    const kvar = await this.kvarService.findDostupan(kvarId, korisnikId, uloga);
    await this.kvarPravaService.proveriPracenje(kvar, korisnikId);

    await this.dataSource.transaction(async (manager) => {
      const zakljucan = await manager.findOne(Kvar, {
        where: { id: kvarId },
        select: { id: true, status: true },
        lock: { mode: 'pessimistic_read' },
      });
      if (!zakljucan || !OTVORENI_STATUSI.includes(zakljucan.status)) {
        throw new ConflictException('Kvar je već rešen ili završen!');
      }
      await manager
        .createQueryBuilder()
        .insert()
        .into(PratilacKvara)
        .values({ kvar: { id: kvarId }, korisnik: { id: korisnikId } })
        .orIgnore()
        .execute();
    });
    return await this.stanje(kvarId, korisnikId);
  }

  async prestani(kvarId: number, korisnikId: number, uloga: Uloga) {
    await this.kvarService.findDostupan(kvarId, korisnikId, uloga);
    await this.pratilacRepository.delete({
      kvar: { id: kvarId },
      korisnik: { id: korisnikId },
    });
    return await this.stanje(kvarId, korisnikId);
  }

  private async stanje(kvarId: number, korisnikId: number) {
    const [pratim, brojPratilaca] = await Promise.all([
      this.pratilacRepository.exists({
        where: { kvar: { id: kvarId }, korisnik: { id: korisnikId } },
      }),
      this.pratilacRepository.count({ where: { kvar: { id: kvarId } } }),
    ]);
    return { pratim, brojPratilaca };
  }
}
