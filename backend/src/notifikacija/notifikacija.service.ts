import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager, In, LessThan, Repository } from 'typeorm';
import { Notifikacija, TipNotifikacije } from './notifikacija.entity.js';
import { NotifikacijaUpitDto } from './dto/notifikacija-upit.dto.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { AKTIVAN_KORISNIK } from '../korisnik/aktivan-korisnik.js';
import { Stranica, velicinaStrane } from '../shared/stranicenje.js';
import { MS_PO_DANU } from '../shared/vreme.js';
import { BRISANJE_PO, DANA_CUVANJA } from './notifikacija.constants.js';
import { NotifikacijaGateway } from './notifikacija.gateway.js';
import { nePostoji } from '../shared/ne-postoji.js';

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
      take: velicinaStrane(upit.poStrani),
    });
    return { stavke, ukupno };
  }

  async brojNeprocitanih(korisnikId: number) {
    const poLinku = await this.notifikacijaRepository
      .createQueryBuilder('notifikacija')
      .select('notifikacija.link', 'link')
      .addSelect('COUNT(*)::int', 'broj')
      .addSelect(
        '(ARRAY_AGG(notifikacija.tip ORDER BY notifikacija.id DESC))[1]',
        'tip',
      )
      .where('notifikacija.korisnik = :korisnikId', { korisnikId })
      .andWhere('notifikacija.procitano = false')
      .groupBy('notifikacija.link')
      .getRawMany<{
        link: string | null;
        broj: number;
        tip: TipNotifikacije;
      }>();
    return {
      broj: poLinku.reduce((zbir, { broj }) => zbir + broj, 0),
      linkovi: poLinku.filter(({ link }) => link !== null),
    };
  }

  async procitaj(id: number, korisnikId: number): Promise<void> {
    const rezultat = await this.notifikacijaRepository.update(
      { id, korisnik: { id: korisnikId } },
      { procitano: true },
    );
    if (rezultat.affected === 0) {
      throw nePostoji('Notifikacija', id);
    }
  }

  async procitajSve(korisnikId: number, link?: string): Promise<void> {
    await this.notifikacijaRepository.update(
      {
        korisnik: { id: korisnikId },
        procitano: false,
        ...(link !== undefined && { link }),
      },
      { procitano: true },
    );
  }

  prekiniVeze(korisnikId: number) {
    this.gateway.prekiniVeze(korisnikId);
  }

  prekiniSesiju(sid: string) {
    this.gateway.prekiniSesiju(sid);
  }

  async obrisiZaZgradu(
    manager: EntityManager,
    korisnici: number[],
    zgradaId: number,
  ): Promise<void> {
    if (korisnici.length === 0) {
      return;
    }
    await manager
      .createQueryBuilder()
      .delete()
      .from(Notifikacija)
      .where('"korisnikId" IN (:...korisnici)', { korisnici })
      .andWhere(
        `("link" IN (SELECT '/kvarovi/' || "id" FROM "kvar" WHERE "zgradaId" = :zgradaId)
          OR "link" IN (SELECT '/sastanci/' || "id" FROM "sastanak" WHERE "zgradaId" = :zgradaId))`,
        { zgradaId },
      )
      .execute();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async obrisiStare() {
    const granica = new Date(Date.now() - DANA_CUVANJA * MS_PO_DANU);
    let ukupno = 0;
    let obrisano: number;
    do {
      const stare = this.notifikacijaRepository
        .createQueryBuilder('stara')
        .select('stara.id')
        .where('stara.datumKreiranja < :granica')
        .limit(BRISANJE_PO);
      const rezultat = await this.notifikacijaRepository
        .createQueryBuilder()
        .delete()
        .where(`"id" IN (${stare.getQuery()})`, { granica })
        .execute();
      obrisano = rezultat.affected ?? 0;
      ukupno += obrisano;
    } while (obrisano === BRISANJE_PO);
    if (ukupno > 0) {
      this.logger.log(`Obrisano starih notifikacija: ${ukupno}`);
    }
  }
}
