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
    return await this.zgradaRepository.remove(zgrada);
  }
}
