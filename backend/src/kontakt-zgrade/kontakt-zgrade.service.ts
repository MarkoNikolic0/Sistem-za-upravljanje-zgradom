import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { parsePhoneNumberWithError } from 'libphonenumber-js/min';
import { KontaktZgrade } from './kontakt-zgrade.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { sadrzi } from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { CreateKontaktDto } from './dto/create-kontakt.dto.js';
import { UpdateKontaktDto } from './dto/update-kontakt.dto.js';

export const MAKS_KONTAKATA = 20;

function uE164(telefon: string) {
  return parsePhoneNumberWithError(telefon, 'RS').number;
}

@Injectable()
export class KontaktZgradeService {
  constructor(
    @InjectRepository(KontaktZgrade)
    private kontaktRepository: Repository<KontaktZgrade>,
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
    private korisnikService: KorisnikService,
    private dataSource: DataSource,
  ) {}

  async findAll(zgradaId: number, korisnikId: number, uloga: Uloga) {
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    if (!sadrzi(p.zgrade, zgradaId)) {
      throw new ForbiddenException('Nemate pristup ovoj zgradi!');
    }
    await this.postojiZgrada(zgradaId);

    return await this.kontaktRepository.find({
      where: { zgrada: { id: zgradaId } },
      order: { id: 'ASC' },
    });
  }

  async create(
    zgradaId: number,
    korisnikId: number,
    uloga: Uloga,
    dto: CreateKontaktDto,
  ) {
    await this.proveriUpravnika(zgradaId, korisnikId, uloga);

    return await this.dataSource.transaction(async (manager) => {
      const zgrada = await manager.findOne(Zgrada, {
        where: { id: zgradaId },
        select: { id: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!zgrada) {
        throw new NotFoundException(`Zgrada sa id-jem ${zgradaId} ne postoji!`);
      }
      const broj = await manager.count(KontaktZgrade, {
        where: { zgrada: { id: zgradaId } },
      });
      if (broj >= MAKS_KONTAKATA) {
        throw new ConflictException(
          `Zgrada može imati najviše ${MAKS_KONTAKATA} kontakata.`,
        );
      }
      return await manager.save(
        manager.create(KontaktZgrade, {
          naziv: dto.naziv,
          uloga: dto.uloga,
          telefon: uE164(dto.telefon),
          zgrada: { id: zgradaId },
        }),
      );
    });
  }

  async update(
    zgradaId: number,
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: UpdateKontaktDto,
  ) {
    await this.proveriUpravnika(zgradaId, korisnikId, uloga);
    const kontakt = await this.nadjiKontakt(zgradaId, id);
    Object.assign(kontakt, {
      naziv: dto.naziv ?? kontakt.naziv,
      uloga: dto.uloga ?? kontakt.uloga,
      telefon: dto.telefon ? uE164(dto.telefon) : kontakt.telefon,
    });

    return await this.kontaktRepository.save(kontakt);
  }

  async remove(zgradaId: number, id: number, korisnikId: number, uloga: Uloga) {
    await this.proveriUpravnika(zgradaId, korisnikId, uloga);
    const kontakt = await this.nadjiKontakt(zgradaId, id);
    await this.kontaktRepository.remove(kontakt);
  }

  private async proveriUpravnika(
    zgradaId: number,
    korisnikId: number,
    uloga: Uloga,
  ) {
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    if (!sadrzi(p.upravlja, zgradaId)) {
      throw new ForbiddenException(
        'Kontakte uređuje samo upravnik ove zgrade!',
      );
    }
    await this.postojiZgrada(zgradaId);
  }

  private async postojiZgrada(zgradaId: number) {
    if (!(await this.zgradaRepository.existsBy({ id: zgradaId }))) {
      throw new NotFoundException(`Zgrada sa id-jem ${zgradaId} ne postoji!`);
    }
  }

  private async nadjiKontakt(zgradaId: number, id: number) {
    const kontakt = await this.kontaktRepository.findOne({
      where: { id, zgrada: { id: zgradaId } },
    });
    if (!kontakt) {
      throw new NotFoundException(`Kontakt sa id-jem ${id} ne postoji!`);
    }
    return kontakt;
  }
}
