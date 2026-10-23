import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { KomentarKvar } from './komentar-kvar.entity.js';
import { DataSource, LessThan, Repository } from 'typeorm';
import { CreateKomentarDto } from './dto/create-komentar.dto.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { KvarService } from '../kvar/kvar.service.js';
import { MAKS_PO_STRANI, Stranica } from '../shared/stranicenje.js';
import { KomentarUpitDto } from './dto/komentar-upit.dto.js';
import { PromenaStatusaKvara } from '../kvar/promena-statusa-kvara.entity.js';
import { KvarPravaService } from '../kvar/kvar-prava.service.js';
import { jeZavrsen } from '../kvar/kvar.constants.js';
import { Kvar } from '../kvar/kvar.entity.js';

@Injectable()
export class KomentarKvarService {
  constructor(
    @InjectRepository(KomentarKvar)
    private komentarKvarRepository: Repository<KomentarKvar>,
    private kvarService: KvarService,
    private kvarPravaService: KvarPravaService,
    @InjectRepository(PromenaStatusaKvara)
    private promenaRepository: Repository<PromenaStatusaKvara>,
    private dataSource: DataSource,
  ) {}

  async create(
    kvarId: number,
    korisnikId: number,
    uloga: Uloga,
    dto: CreateKomentarDto,
  ) {
    const kvar = await this.kvarService.findDostupan(kvarId, korisnikId, uloga);

    const id = await this.dataSource.transaction(async (manager) => {
      const zakljucan = await manager.findOneOrFail(Kvar, {
        where: { id: kvar.id },
        select: { id: true, status: true },
        lock: { mode: 'pessimistic_read' },
      });
      if (jeZavrsen(zakljucan.status)) {
        throw new ConflictException(
          'Kvar je završen, pa više ne može da se komentariše.',
        );
      }
      const { identifiers } = await manager.insert(KomentarKvar, {
        tekst: dto.tekst,
        kvar: { id: kvar.id },
        korisnik: { id: korisnikId },
      });
      return identifiers[0].id as number;
    });

    return await this.komentarKvarRepository.findOneOrFail({
      where: { id },
      relations: { korisnik: true },
    });
  }

  async findZaKvar(
    kvarId: number,
    korisnikId: number,
    uloga: Uloga,
    upit: KomentarUpitDto,
  ): Promise<Stranica<KomentarKvar>> {
    await this.kvarService.findDostupan(kvarId, korisnikId, uloga);

    const [stavke, ukupno] = await this.komentarKvarRepository.findAndCount({
      where: {
        kvar: { id: kvarId },
        ...(upit.preId ? { id: LessThan(upit.preId) } : {}),
      },
      relations: { korisnik: true },
      order: { id: 'DESC' },
      take: Math.min(upit.poStrani, MAKS_PO_STRANI),
    });

    return { stavke, ukupno };
  }

  async remove(
    kvarId: number,
    komentarId: number,
    korisnikId: number,
    uloga: Uloga,
  ): Promise<void> {
    const komentar = await this.komentarKvarRepository.findOne({
      where: { id: komentarId, kvar: { id: kvarId } },
      relations: { korisnik: true, kvar: { zgrada: true } },
    });
    if (!komentar) {
      throw new NotFoundException(
        `Komentar sa id-jem ${komentarId} ne postoji!`,
      );
    }

    if (
      !(await this.kvarPravaService.smeDaUpravlja(
        komentar.kvar,
        korisnikId,
        uloga,
      ))
    ) {
      if (komentar.korisnik.id !== korisnikId) {
        throw new ForbiddenException(`Možete brisati samo svoje komentare!`);
      }
      if (jeZavrsen(komentar.kvar.status)) {
        throw new ConflictException(
          'Kvar je završen, pa komentari više ne mogu da se brišu.',
        );
      }
      const razlogPromene = await this.promenaRepository.exists({
        where: { komentar: { id: komentarId } },
      });
      if (razlogPromene) {
        throw new ForbiddenException(
          'Komentar koji je razlog promene statusa ne može da se obriše.',
        );
      }
    }

    await this.komentarKvarRepository.remove(komentar);
  }
}
