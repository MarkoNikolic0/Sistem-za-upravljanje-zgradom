import {
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

@Injectable()
export class KomentarKvarService {
  constructor(
    @InjectRepository(KomentarKvar)
    private komentarKvarRepository: Repository<KomentarKvar>,
    private kvarService: KvarService,
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
  ) {}

  async create(korisnikId: number, uloga: Uloga, dto: CreateKomentarDto) {
    const kvar = await this.kvarService.findDostupan(
      dto.kvarId,
      korisnikId,
      uloga,
    );

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

  async remove(komentarId: number, korisnikId: number, uloga: Uloga) {
    const komentar = await this.komentarKvarRepository.findOne({
      where: { id: komentarId },
      relations: { korisnik: true, kvar: { zgrada: true } },
    });
    if (!komentar) {
      throw new NotFoundException(
        `Komentar sa id-jem ${komentarId} ne postoji!`,
      );
    }

    const autor = komentar.korisnik.id === korisnikId;
    if (
      !autor &&
      !(await this.kvarService.smeDaUpravlja(komentar.kvar, korisnikId, uloga))
    ) {
      throw new ForbiddenException(`Mozete brisati samo svoje komentare!`);
    }

    return await this.komentarKvarRepository.remove(komentar);
  }
}
