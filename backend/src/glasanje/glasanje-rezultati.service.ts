import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Glasanje } from './glasanje.entity.js';
import { Glas } from './glas.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { Oglas } from '../oglas/oglas.entity.js';
import type { PristupZgradama } from '../korisnik/pristup-zgradama.js';
import { VrstaGlasanja } from '../shared/enums/glasanje.enums.js';
import { type GlasStana, prikazGlasanja } from './prikaz-glasanja.js';

@Injectable()
export class GlasanjeRezultatiService {
  constructor(
    @InjectRepository(Glasanje)
    private glasanjeRepository: Repository<Glasanje>,
    @InjectRepository(Glas) private glasRepository: Repository<Glas>,
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    @InjectRepository(Oglas) private oglasRepository: Repository<Oglas>,
  ) {}

  // Glasanje posle izmene, sa rezultatima za korisnika
  async jedno(id: number, korisnikId: number, p: PristupZgradama) {
    const glasanje = await this.glasanjeRepository.findOneOrFail({
      where: { id },
      relations: { zgrada: true, kreirao: true, opcije: true },
    });
    return this.jednoSaRezultatima(glasanje, korisnikId, p);
  }

  async jednoSaRezultatima(
    glasanje: Glasanje,
    korisnikId: number,
    p: PristupZgradama,
  ) {
    const [rezultat] = await this.saRezultatima([glasanje], korisnikId, p);
    return rezultat;
  }

  // Odluke sa rezultatima za dnevni red sastanka (pristup sastanku je već proveren)
  async odluke(ids: number[], korisnikId: number, p: PristupZgradama) {
    if (ids.length === 0) {
      return [];
    }
    const odluke = await this.glasanjeRepository.find({
      where: { id: In(ids), vrsta: VrstaGlasanja.ODLUKA },
      relations: { zgrada: true, kreirao: true, opcije: true },
    });
    return this.saRezultatima(odluke, korisnikId, p);
  }

  async saRezultatima(
    glasanja: Glasanje[],
    korisnikId: number,
    p: PristupZgradama,
    sada = new Date(),
  ) {
    if (glasanja.length === 0) {
      return [];
    }
    const ids = glasanja.map((g) => g.id);
    const zgrade = [...new Set(glasanja.map((g) => g.zgrada.id))];
    const odluke = glasanja
      .filter((g) => g.vrsta === VrstaGlasanja.ODLUKA)
      .map((g) => g.id);

    const [poOpciji, moji, stanari, glasoviStanova, objave] = await Promise.all(
      [
        this.glasRepository
          .createQueryBuilder('glas')
          .select('glas.opcijaId', 'opcijaId')
          .addSelect('COUNT(*)::int', 'broj')
          .where('glas.glasanjeId IN (:...ids)', { ids })
          .groupBy('glas.opcijaId')
          .getRawMany<{ opcijaId: number; broj: number }>(),
        this.glasRepository.find({
          where: {
            glasanje: { id: In(ids) },
            korisnik: { id: korisnikId },
            stan: IsNull(),
          },
          relations: { glasanje: true, opcija: true },
          select: { id: true, glasanje: { id: true }, opcija: { id: true } },
        }),
        // Pravo glasa u anketi ima svako ko ima stan u zgradi (vlasnik i ukucanin)
        this.stanarStanaRepository
          .createQueryBuilder('veza')
          .innerJoin('veza.stan', 'stan')
          .select('stan.zgradaId', 'zgradaId')
          .addSelect('COUNT(DISTINCT veza.korisnikId)::int', 'broj')
          .where('stan.zgradaId IN (:...zgrade)', { zgrade })
          .groupBy('stan.zgradaId')
          .getRawMany<{ zgradaId: number; broj: number }>(),
        odluke.length === 0
          ? []
          : this.glasoviMojihStanova(odluke, korisnikId, p),
        odluke.length === 0
          ? []
          : this.oglasRepository.find({
              where: { glasanje: { id: In(odluke) } },
              relations: { glasanje: true },
              select: { id: true, glasanje: { id: true } },
            }),
      ],
    );

    const podaci = {
      brojPoOpciji: new Map(poOpciji.map((r) => [r.opcijaId, r.broj])),
      mojGlasPoAnketi: new Map(
        moji.map((glas) => [glas.glasanje.id, glas.opcija.id]),
      ),
      stanaraPoZgradi: new Map(stanari.map((r) => [r.zgradaId, r.broj])),
      oglasPoOdluci: new Map(
        objave.map((oglas) => [oglas.glasanje?.id, oglas.id]),
      ),
      glasoviStanova,
    };
    return glasanja.map((glasanje) =>
      prikazGlasanja(glasanje, p, podaci, sada),
    );
  }

  // Glasovi u datim odlukama za stanove u kojima je korisnik vlasnik
  private async glasoviMojihStanova(
    odluke: number[],
    korisnikId: number,
    p: PristupZgradama,
  ): Promise<GlasStana[]> {
    if (p.vlasnickiStanovi.length === 0) {
      return [];
    }
    const glasovi = await this.glasRepository.find({
      where: {
        glasanje: { id: In(odluke) },
        stan: { id: In(p.vlasnickiStanovi.map((stan) => stan.id)) },
      },
      relations: { glasanje: true, opcija: true, korisnik: true, stan: true },
      select: {
        id: true,
        glasanje: { id: true },
        opcija: { id: true },
        korisnik: { id: true },
        stan: { id: true, broj: true },
      },
    });
    return glasovi.map((glas) => ({
      glasanjeId: glas.glasanje.id,
      opcijaId: glas.opcija.id,
      stan: glas.stan?.broj ?? '',
      moj: glas.korisnik.id === korisnikId,
    }));
  }
}
