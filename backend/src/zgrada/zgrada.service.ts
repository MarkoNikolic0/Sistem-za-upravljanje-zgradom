import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Zgrada } from './zgrada.entity.js';
import { AKTIVNA_ZGRADA } from './aktivna-zgrada.js';
import { Repository } from 'typeorm';
import { Stan } from '../stan/stan.entity.js';
import { Kvar } from '../kvar/kvar.entity.js';
import { CreateZgradaDto } from './dto/create-zgrada.dto.js';
import { UpdateZgradaDto } from './dto/update-zgrada.dto.js';
import { Oglas } from '../oglas/oglas.entity.js';
import { Glasanje } from '../glasanje/glasanje.entity.js';
import { Sastanak } from '../sastanak/sastanak.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { brojPoZgradi } from './broj-po-zgradi.js';
import { DokumentZgrade } from '../dokument-zgrade/dokument-zgrade.entity.js';

@Injectable()
export class ZgradaService {
  constructor(
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
  ) {}

  async create(dto: CreateZgradaDto) {
    const zgrada = this.zgradaRepository.create(dto);
    return await this.zgradaRepository.save(zgrada);
  }

  async findAll() {
    return await this.zgradaRepository.find({ where: AKTIVNA_ZGRADA });
  }

  async findSaBrojevima() {
    const zgrade = await this.zgradaRepository.find({
      relations: { upravnik: true },
      select: {
        id: true,
        naziv: true,
        adresa: true,
        arhivirana: true,
        upravnik: { id: true, ime: true, prezime: true },
      },
      order: { naziv: 'ASC' },
    });
    if (zgrade.length === 0) {
      return [];
    }
    const ids = zgrade.map((z) => z.id);

    const [stanovi, stanari] = await Promise.all([
      brojPoZgradi(
        this.stanRepository.createQueryBuilder('stan'),
        'stan.zgradaId',
        ids,
      ),
      brojPoZgradi(
        this.stanarStanaRepository
          .createQueryBuilder('veza')
          .innerJoin('veza.stan', 'stan'),
        'stan.zgradaId',
        ids,
        'COUNT(DISTINCT veza.korisnikId)',
      ),
    ]);

    return zgrade.map(({ id, naziv, adresa, arhivirana, upravnik }) => ({
      id,
      naziv,
      adresa,
      arhivirana,
      brojStanova: stanovi.get(id) ?? 0,
      brojStanara: stanari.get(id) ?? 0,
      upravnik,
    }));
  }

  async findOne(id: number) {
    const zgrada = await this.zgradaRepository.findOne({
      where: { id, ...AKTIVNA_ZGRADA },
    });
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
    await this.zgradaRepository.manager.transaction(async (manager) => {
      const zgrada = await manager.findOne(Zgrada, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!zgrada) {
        throw new NotFoundException(`Zgrada sa id-jem ${id} ne postoji!`);
      }

      const veze = {
        stanova: Stan,
        kvarova: Kvar,
        oglasa: Oglas,
        glasanja: Glasanje,
        sastanaka: Sastanak,
        dokumenata: DokumentZgrade,
      };
      const ima = zgrada.upravnikId === null ? [] : ['upravnika 1'];
      for (const [naziv, entitet] of Object.entries(veze)) {
        const broj = await manager.count(entitet, {
          where: { zgrada: { id } },
        });
        if (broj > 0) {
          ima.push(`${naziv} ${broj}`);
        }
      }
      if (ima.length > 0) {
        throw new ConflictException(
          `Zgrada se ne može obrisati jer ima: ${ima.join(', ')}.`,
        );
      }

      await manager.remove(zgrada);
    });
  }
}
