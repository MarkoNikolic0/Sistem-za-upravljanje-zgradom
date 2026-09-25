import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { KomentarKvar } from './komentar-kvar.entity.js';
import { In, Repository } from 'typeorm';
import { Kvar } from '../kvar/kvar.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { CreateKomentarDto } from './dto/create-komentar.dto.js';
import { Uloga } from '../shared/enums/uloga.enum.js';

@Injectable()
export class KomentarKvarService {
  constructor(
    @InjectRepository(KomentarKvar)
    private komentarKvarRepository: Repository<KomentarKvar>,
    @InjectRepository(Kvar) private kvarRepository: Repository<Kvar>,
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
  ) {}

  async create(korisnikId: number, dto: CreateKomentarDto) {
    const kvar = await this.kvarRepository.findOne({
      where: { id: dto.kvarId },
    });
    if (!kvar) {
      throw new NotFoundException(`Kvar sa id-jem ${dto.kvarId} ne postoji!`);
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
      kvar,
      korisnik,
    });

    return await this.komentarKvarRepository.save(komentar);
  }

  async findZaKvar(kvarId: number) {
    return await this.komentarKvarRepository.find({
      where: { kvar: { id: kvarId } },
      relations: { korisnik: true },
      order: { datumKreiranja: 'ASC' },
    });
  }

  async remove(komentarId: number, korisnikId: number, uloga: Uloga) {
    const komentar = await this.komentarKvarRepository.findOne({
      where: { id: komentarId },
      relations: { korisnik: true },
    });
    if (!komentar) {
      throw new NotFoundException(
        `Komentar sa id-jem ${komentarId} ne postoji!`,
      );
    }

    const autor = komentar.korisnik.id === korisnikId;
    const moderator = uloga === Uloga.ADMIN || uloga === Uloga.UPRAVNIK;

    if (!autor && !moderator) {
      throw new ForbiddenException(`Mozete brisati samo svoje komentare!`);
    }

    return await this.komentarKvarRepository.remove(komentar);
  }
}
