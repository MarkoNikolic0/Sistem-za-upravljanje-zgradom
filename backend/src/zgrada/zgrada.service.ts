import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Zgrada } from './zgrada.entity.js';
import { Repository } from 'typeorm';
import { CreateZgradaDto } from './dto/create-zgrada.dto.js';
import { UpdateZgradaDto } from './dto/update-zgrada.dto.js';

@Injectable()
export class ZgradaService {
  constructor(
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
  ) {}

  create(dto: CreateZgradaDto) {
    const zgrada = this.zgradaRepository.create(dto);
    return this.zgradaRepository.save(zgrada);
  }

  findAll() {
    return this.zgradaRepository.find();
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
    return this.zgradaRepository.save(zgrada);
  }

  async remove(id: number) {
    const zgrada = await this.findOne(id);
    return this.zgradaRepository.remove(zgrada);
  }
}
