import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { KomentarKvar } from './komentar-kvar.entity.js';
import { LessThan, Repository } from 'typeorm';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { CreateKomentarDto } from './dto/create-komentar.dto.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { KvarService } from '../kvar/kvar.service.js';
import { MAKS_PO_STRANI, Stranica } from '../shared/stranicenje.js';
import { KomentarUpitDto } from './dto/komentar-upit.dto.js';
import { PromenaStatusaKvara } from '../kvar/promena-statusa-kvara.entity.js';
import { KvarPravaService } from '../kvar/kvar-prava.service.js';
import { jeZavrsen } from '../kvar/kvar.constants.js';

@Injectable()
export class KomentarKvarService {
  constructor(
    @InjectRepository(KomentarKvar)
    private komentarKvarRepository: Repository<KomentarKvar>,
    private kvarService: KvarService,
    private kvarPravaService: KvarPravaService,
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
    @InjectRepository(PromenaStatusaKvara)
    private promenaRepository: Repository<PromenaStatusaKvara>,
  ) {}

  async create(korisnikId: number, uloga: Uloga, dto: CreateKomentarDto) {
    const kvar = await this.kvarService.findDostupan(
      dto.kvarId,
      korisnikId,
      uloga,
    );

    if (jeZavrsen(kvar.status)) {
      throw new ConflictException(
        'Kvar je završen, pa više ne može da se komentariše.',
      );
    }

    const korisnik = await this.korisnikRepository.findOne({
      where: { id: korisnikId },
    });
    if (!korisnik) {
      throw new NotFoundException(
        `Korisnik sa id-jem ${korisnikId} ne postoji!`,
      );
    }

    const komentar = this.komentarKvarRepository.create({
      tekst: dto.tekst,
      kvar: { id: kvar.id },
      korisnik,
    });

    return await this.komentarKvarRepository.save(komentar);
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
    komentarId: number,
    korisnikId: number,
    uloga: Uloga,
  ): Promise<void> {
    const komentar = await this.komentarKvarRepository.findOne({
      where: { id: komentarId },
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
      const razlogVracanja = await this.promenaRepository.exists({
        where: { komentar: { id: komentarId } },
      });
      if (razlogVracanja) {
        throw new ForbiddenException(
          'Komentar sa razlogom zašto kvar nije rešen ne može da se obriše.',
        );
      }
    }

    await this.komentarKvarRepository.remove(komentar);
  }
}
