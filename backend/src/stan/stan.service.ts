import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Stan } from './stan.entity.js';
import { Repository } from 'typeorm';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { CreateStanDto } from './dto/create-stan.dto.js';
import { UpdateStanDto } from './dto/update-stan.dto.js';

@Injectable()
export class StanService {
  constructor(
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
  ) {}

  async create(dto: CreateStanDto) {
    const zgrada = await this.zgradaRepository.findOne({
      where: { id: dto.zgradaId },
    });
    if (!zgrada) {
      throw new NotFoundException(
        `Zgrada sa id-jem ${dto.zgradaId} ne postoji!`,
      );
    }

    const stan = this.stanRepository.create({
      broj: dto.broj,
      sprat: dto.sprat,
      kvadratura: dto.kvadratura,
      zgrada,
    });
    return await this.stanRepository.save(stan);
  }

  async findAll() {
    return await this.stanRepository.find({ relations: { zgrada: true } });
  }

  async findByZgrada(zgradaId: number) {
    return await this.stanRepository.find({
      where: { zgrada: { id: zgradaId } },
    });
  }

  async findOne(stanId: number) {
    const stan = await this.stanRepository.findOne({ where: { id: stanId } });
    if (!stan) {
      throw new NotFoundException(`Stan sa id-jem ${stanId} ne postoji!`);
    }
    return stan;
  }

  async update(id: number, dto: UpdateStanDto) {
    const stan = await this.findOne(id);
    if (dto.zgradaId) {
      const zgrada = await this.zgradaRepository.findOne({
        where: { id: dto.zgradaId },
      });
      if (!zgrada) {
        throw new NotFoundException(
          `Zgrada sa id-jem ${dto.zgradaId} ne postoji!`,
        );
      }
      stan.zgrada = zgrada;
    }
    Object.assign(stan, {
      broj: dto.broj ?? stan.broj,
      sprat: dto.sprat ?? stan.sprat,
      kvadratura: dto.kvadratura ?? stan.kvadratura,
    });
    return await this.stanRepository.save(stan);
  }

  async remove(id: number) {
    const stan = await this.findOne(id);
    return await this.stanRepository.remove(stan);
  }
}
