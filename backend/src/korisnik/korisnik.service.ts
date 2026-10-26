import { Injectable, NotFoundException } from '@nestjs/common';
import { Korisnik } from './korisnik.entity.js';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { parsePhoneNumberWithError } from 'libphonenumber-js/min';
import { UpdateProfilDto } from './dto/update-profil.dto.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import type { PristupZgradama } from './pristup-zgradama.js';

@Injectable()
export class KorisnikService {
  constructor(
    @InjectRepository(Korisnik)
    private readonly korisnikRepository: Repository<Korisnik>,
    @InjectRepository(StanarStana)
    private readonly stanarStanaRepository: Repository<StanarStana>,
  ) {}

  async zgradaUpravnika(korisnikId: number): Promise<number | null> {
    const korisnik = await this.korisnikRepository.findOne({
      where: { id: korisnikId },
      relations: { zgrada: true },
    });

    return korisnik?.zgrada?.id ?? null;
  }

  async pristupZgradama(
    korisnikId: number,
    uloga: Uloga,
  ): Promise<PristupZgradama> {
    const veze = await this.stanarStanaRepository.find({
      where: { korisnik: { id: korisnikId } },
      relations: { stan: { zgrada: true } },
      select: {
        id: true,
        vlasnik: true,
        stan: { id: true, zgrada: { id: true } },
      },
    });
    const stanuje = [...new Set(veze.map((v) => v.stan.zgrada.id))];
    const poseduje = [
      ...new Set(veze.filter((v) => v.vlasnik).map((v) => v.stan.zgrada.id)),
    ];
    if (uloga === Uloga.ADMIN) {
      return { stanuje, poseduje, zgrade: null, upravlja: null };
    }
    const zgradaUpravnika =
      uloga === Uloga.UPRAVNIK ? await this.zgradaUpravnika(korisnikId) : null;
    const upravlja = zgradaUpravnika === null ? [] : [zgradaUpravnika];
    const zgrade = [...new Set([...stanuje, ...upravlja])];
    return { stanuje, poseduje, zgrade, upravlja };
  }

  async mojProfil(korisnikId: number) {
    const korisnik = await this.nadjiKorisnika(korisnikId);

    const veze = await this.stanarStanaRepository.find({
      where: { korisnik: { id: korisnikId } },
      relations: { stan: { zgrada: true } },
      order: { stan: { broj: 'ASC' } },
    });

    return {
      id: korisnik.id,
      ime: korisnik.ime,
      prezime: korisnik.prezime,
      email: korisnik.email,
      telefon: korisnik.telefon,
      uloga: korisnik.uloga,
      kreiranDatum: korisnik.kreiranDatum,
      // Samo upravnik ima zgradu kojom upravlja; stanar zgradu dobija preko stana
      zgrada:
        korisnik.uloga === Uloga.UPRAVNIK && korisnik.zgrada
          ? {
              id: korisnik.zgrada.id,
              naziv: korisnik.zgrada.naziv,
              adresa: korisnik.zgrada.adresa,
            }
          : null,
      stanovi: veze.map((veza) => ({
        id: veza.stan.id,
        broj: veza.stan.broj,
        sprat: veza.stan.sprat,
        vlasnik: veza.vlasnik,
        zgrada: {
          id: veza.stan.zgrada.id,
          naziv: veza.stan.zgrada.naziv,
          adresa: veza.stan.zgrada.adresa,
        },
      })),
    };
  }

  async izmeniProfil(korisnikId: number, dto: UpdateProfilDto) {
    const korisnik = await this.nadjiKorisnika(korisnikId);

    Object.assign(korisnik, {
      ime: dto.ime ?? korisnik.ime,
      prezime: dto.prezime ?? korisnik.prezime,
      telefon: dto.telefon
        ? parsePhoneNumberWithError(dto.telefon, 'RS').number
        : korisnik.telefon,
    });
    await this.korisnikRepository.save(korisnik);

    return this.mojProfil(korisnikId);
  }

  private async nadjiKorisnika(korisnikId: number): Promise<Korisnik> {
    const korisnik = await this.korisnikRepository.findOne({
      where: { id: korisnikId },
      relations: { zgrada: true },
    });
    if (!korisnik) {
      throw new NotFoundException('Korisnik ne postoji.');
    }
    return korisnik;
  }
}
