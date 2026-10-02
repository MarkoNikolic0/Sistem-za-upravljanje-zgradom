import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Zgrada } from './zgrada.entity.js';
import { Repository } from 'typeorm';
import { Stan } from '../stan/stan.entity.js';
import { Kvar } from '../kvar/kvar.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { CreateZgradaDto } from './dto/create-zgrada.dto.js';
import { UpdateZgradaDto } from './dto/update-zgrada.dto.js';

@Injectable()
export class ZgradaService {
  constructor(
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    @InjectRepository(Kvar) private kvarRepository: Repository<Kvar>,
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
  ) {}

  async create(dto: CreateZgradaDto) {
    const zgrada = this.zgradaRepository.create(dto);
    return await this.zgradaRepository.save(zgrada);
  }

  async findAll() {
    return await this.zgradaRepository.find();
  }

  async findOne(id: number) {
    const zgrada = await this.zgradaRepository.findOne({ where: { id } });
    if (!zgrada) {
      throw new NotFoundException(`Zgrada sa id-jem ${id} ne postoji!`);
    }
    return zgrada;
  }

  async update(id: number, dto: UpdateZgradaDto) {
    const zgrada = await this.findOne(id);
    Object.assign(zgrada, dto);
    return await this.zgradaRepository.save(zgrada);
  }

  async remove(id: number) {
    const zgrada = await this.findOne(id);

    const [stanovi, kvarovi, upravnici] = await Promise.all([
      this.stanRepository.count({ where: { zgrada: { id } } }),
      this.kvarRepository.count({ where: { zgrada: { id } } }),
      this.korisnikRepository.count({ where: { zgrada: { id } } }),
    ]);
    if (stanovi + kvarovi + upravnici > 0) {
      throw new ConflictException(
        `Zgrada se ne može obrisati jer ima: stanova ${stanovi}, kvarova ${kvarovi}, upravnika ${upravnici}.`,
      );
    }

    return await this.zgradaRepository.remove(zgrada);
  }
}
