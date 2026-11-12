import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager, In, LessThan, Repository } from 'typeorm';
import { Notifikacija, TipNotifikacije } from './notifikacija.entity.js';
import { NotifikacijaUpitDto } from './dto/notifikacija-upit.dto.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { AKTIVAN_KORISNIK } from '../korisnik/aktivan-korisnik.js';
import { MAKS_PO_STRANI, Stranica } from '../shared/stranicenje.js';
import { MS_PO_DANU } from '../shared/vreme.js';
import { DANA_CUVANJA } from './notifikacija.constants.js';
import { NotifikacijaGateway } from './notifikacija.gateway.js';

export interface NovaNotifikacija {
  tip: TipNotifikacije;
  tekst: string;
  link: string | null;
}

@Injectable()
export class NotifikacijaService {
  private readonly logger = new Logger(NotifikacijaService.name);

  constructor(
    @InjectRepository(Notifikacija)
    private notifikacijaRepository: Repository<Notifikacija>,
    private gateway: NotifikacijaGateway,
  ) {}

  async obavesti(
    manager: EntityManager,
    primaoci: number[],
    nova: NovaNotifikacija,
    akterId?: number,
  ): Promise<void> {
    const ids = [...new Set(primaoci)].filter((id) => id !== akterId);
    if (ids.length === 0) {
      return;
    }
    const aktivni = await manager.find(Korisnik, {
      where: { id: In(ids), ...AKTIVAN_KORISNIK },
      select: { id: true },
    });
    if (aktivni.length === 0) {
      return;
    }
    await manager.save(
      Notifikacija,
      aktivni.map((k) => ({ ...nova, korisnik: { id: k.id } })),
    );
  }

  async findAll(
    korisnikId: number,
    upit: NotifikacijaUpitDto,
  ): Promise<Stranica<Notifikacija>> {
    const [stavke, ukupno] = await this.notifikacijaRepository.findAndCount({
      where: {
        korisnik: { id: korisnikId },
        ...(upit.neprocitane && { procitano: false }),
        ...(upit.preId && { id: LessThan(upit.preId) }),
      },
      order: { id: 'DESC' },
      take: Math.min(upit.poStrani, MAKS_PO_STRANI),
    });
    return { stavke, ukupno };
  }

  async brojNeprocitanih(korisnikId: number) {
    const broj = await this.notifikacijaRepository.countBy({
      korisnik: { id: korisnikId },
      procitano: false,
    });
    return { broj };
  }

  async procitaj(id: number, korisnikId: number): Promise<void> {
    const rezultat = await this.notifikacijaRepository.update(
      { id, korisnik: { id: korisnikId } },
      { procitano: true },
    );
    if (rezultat.affected === 0) {
      throw new NotFoundException(`Notifikacija sa id-jem ${id} ne postoji!`);
    }
  }

  async procitajSve(korisnikId: number): Promise<void> {
    await this.notifikacijaRepository.update(
      { korisnik: { id: korisnikId }, procitano: false },
      { procitano: true },
    );
  }

  prekiniVeze(korisnikId: number) {
    this.gateway.prekiniVeze(korisnikId);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async obrisiStare() {
    const granica = new Date(Date.now() - DANA_CUVANJA * MS_PO_DANU);
    const { affected } = await this.notifikacijaRepository.delete({
      datumKreiranja: LessThan(granica),
    });
    if (affected) {
      this.logger.log(`Obrisano starih notifikacija: ${affected}`);
    }
  }
}
