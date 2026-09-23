import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ServiserSpecijalnost } from './serviser-specijalnost.entity.js';
import { Repository } from 'typeorm';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { DodajSpecijalnostDto } from './dto/dodaj-specijalnost.dto.js';
import { Uloga } from '../shared/enums/uloga.enum.js';

@Injectable()
export class ServiserSpecijalnostService {
  constructor(
    @InjectRepository(ServiserSpecijalnost)
    private specijalnostRepository: Repository<ServiserSpecijalnost>,
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
  ) {}

  async dodaj(dto: DodajSpecijalnostDto) {
    const korisnik = await this.korisnikRepository.findOne({
      where: { id: dto.korisnikId },
    });
    if (!korisnik) {
      throw new NotFoundException(
        `Korisnik sa ID ${dto.korisnikId} ne postoji.`,
      );
    }
    if (korisnik.uloga !== Uloga.SERVISER) {
      throw new BadRequestException(
        'Specijalnost se moze dodeliti samo korisniku sa ulogom serviser.',
      );
    }

    const postojecaSpecijalnost = await this.specijalnostRepository.findOne({
      where: { korisnik: { id: dto.korisnikId }, kategorija: dto.kategorija },
    });
    if (postojecaSpecijalnost) {
      throw new BadRequestException('Serviser vec ima ovu specijalnost.');
    }

    const specijalnost = this.specijalnostRepository.create({
      korisnik,
      kategorija: dto.kategorija,
    });
    return await this.specijalnostRepository.save(specijalnost);
  }

  async findZaServisera(korisnikId: number) {
    return await this.specijalnostRepository.find({
      where: { korisnik: { id: korisnikId } },
    });
  }

  async ukloni(id: number) {
    const specijalnost = await this.specijalnostRepository.findOne({
      where: { id },
    });
    if (!specijalnost) {
      throw new NotFoundException(`Specijalnost sa ID ${id} ne postoji.`);
    }
    return await this.specijalnostRepository.remove(specijalnost);
  }
}
