import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Zgrada } from './zgrada.entity.js';
import { IsNull, Not, Repository } from 'typeorm';
import { Stan } from '../stan/stan.entity.js';
import { Kvar } from '../kvar/kvar.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { CreateZgradaDto } from './dto/create-zgrada.dto.js';
import { UpdateZgradaDto } from './dto/update-zgrada.dto.js';
import { Oglas } from '../oglas/oglas.entity.js';
import { Glasanje } from '../glasanje/glasanje.entity.js';
import { Sastanak } from '../sastanak/sastanak.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { brojPoZgradi } from './broj-po-zgradi.js';

@Injectable()
export class ZgradaService {
  constructor(
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    @InjectRepository(Kvar) private kvarRepository: Repository<Kvar>,
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
    @InjectRepository(Oglas) private oglasRepository: Repository<Oglas>,
    @InjectRepository(Glasanje)
    private glasanjeRepository: Repository<Glasanje>,
    @InjectRepository(Sastanak)
    private sastanakRepository: Repository<Sastanak>,
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
  ) {}

  async create(dto: CreateZgradaDto) {
    const zgrada = this.zgradaRepository.create(dto);
    return await this.zgradaRepository.save(zgrada);
  }

  async findAll() {
    return await this.zgradaRepository.find();
  }

  async findSaBrojevima() {
    const zgrade = await this.zgradaRepository.find({
      select: { id: true, naziv: true, adresa: true },
      order: { naziv: 'ASC' },
    });
    if (zgrade.length === 0) {
      return [];
    }
    const ids = zgrade.map((z) => z.id);

    const [stanovi, stanari, upravnici] = await Promise.all([
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
      this.korisnikRepository.find({
        where: { uloga: Uloga.UPRAVNIK, zgrada: { id: Not(IsNull()) } },
        relations: { zgrada: true },
        select: { id: true, ime: true, prezime: true, zgrada: { id: true } },
      }),
    ]);
    const upravnikZgrade = new Map(
      upravnici.map(({ id, ime, prezime, zgrada }) => [
        zgrada?.id,
        { id, ime, prezime },
      ]),
    );

    return zgrade.map(({ id, naziv, adresa }) => ({
      id,
      naziv,
      adresa,
      brojStanova: stanovi.get(id) ?? 0,
      brojStanara: stanari.get(id) ?? 0,
      upravnik: upravnikZgrade.get(id) ?? null,
    }));
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

    const [stanovi, kvarovi, upravnici, oglasi, glasanja, sastanci] =
      await Promise.all([
        this.stanRepository.count({ where: { zgrada: { id } } }),
        this.kvarRepository.count({ where: { zgrada: { id } } }),
        this.korisnikRepository.count({ where: { zgrada: { id } } }),
        this.oglasRepository.count({ where: { zgrada: { id } } }),
        this.glasanjeRepository.count({ where: { zgrada: { id } } }),
        this.sastanakRepository.count({ where: { zgrada: { id } } }),
      ]);
    if (stanovi + kvarovi + upravnici + oglasi + glasanja + sastanci > 0) {
      throw new ConflictException(
        `Zgrada se ne može obrisati jer ima: stanova ${stanovi}, kvarova ${kvarovi}, upravnika ${upravnici}, oglasa ${oglasi}, glasanja ${glasanja}, sastanaka ${sastanci}.`,
      );
    }

    return await this.zgradaRepository.remove(zgrada);
  }
}
