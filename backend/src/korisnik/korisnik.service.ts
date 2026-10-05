import { Injectable } from '@nestjs/common';
import { Korisnik } from './korisnik.entity.js';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class KorisnikService {
  constructor(
    @InjectRepository(Korisnik)
    private readonly korisnikRepository: Repository<Korisnik>,
  ) {}

  async zgradaUpravnika(korisnikId: number): Promise<number | null> {
    const korisnik = await this.korisnikRepository.findOne({
      where: { id: korisnikId },
      relations: { zgrada: true },
    });

    return korisnik?.zgrada?.id ?? null;
  }
}
