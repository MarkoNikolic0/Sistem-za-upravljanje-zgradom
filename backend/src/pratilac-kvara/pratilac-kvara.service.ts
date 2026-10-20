import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PratilacKvara } from './pratilac-kvara.entity.js';
import { KvarService } from '../kvar/kvar.service.js';
import { KvarPravaService } from '../kvar/kvar-prava.service.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { OTVORENI_STATUSI } from '../kvar/kvar.constants.js';

@Injectable()
export class PratilacKvaraService {
  constructor(
    @InjectRepository(PratilacKvara)
    private pratilacRepository: Repository<PratilacKvara>,
    private kvarService: KvarService,
    private kvarPravaService: KvarPravaService,
  ) {}

  async prati(kvarId: number, korisnikId: number, uloga: Uloga) {
    const kvar = await this.kvarService.findDostupan(kvarId, korisnikId, uloga);
    await this.kvarPravaService.proveriPracenje(kvar, korisnikId);
    if (!OTVORENI_STATUSI.includes(kvar.status)) {
      throw new ConflictException('Kvar je već rešen ili završen!');
    }

    await this.pratilacRepository
      .createQueryBuilder()
      .insert()
      .values({ kvar: { id: kvarId }, korisnik: { id: korisnikId } })
      .orIgnore()
      .execute();
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
