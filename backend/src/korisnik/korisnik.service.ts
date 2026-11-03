import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Korisnik } from './korisnik.entity.js';
import { Brackets, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { parsePhoneNumberWithError } from 'libphonenumber-js/min';
import { UpdateProfilDto } from './dto/update-profil.dto.js';
import { StanjeNaloga, Uloga } from '../shared/enums/uloga.enum.js';
import { sadrzi, type PristupZgradama } from './pristup-zgradama.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { AKTIVNA_ZGRADA, proveriAktivnu } from '../zgrada/aktivna-zgrada.js';
import { KorisnikUpitDto } from './dto/korisnik-upit.dto.js';
import { ServiserSpecijalnost } from '../serviser-specijalnost/serviser-specijalnost.entity.js';
import { type Stranica, stranicenje } from '../shared/stranicenje.js';

function poKorisniku<T extends { korisnik: { id: number } }, R>(
  redovi: T[],
  oblik: (red: T) => R,
): Map<number, R[]> {
  const grupe = new Map<number, R[]>();
  for (const red of redovi) {
    const grupa = grupe.get(red.korisnik.id) ?? [];
    grupa.push(oblik(red));
    grupe.set(red.korisnik.id, grupa);
  }
  return grupe;
}

@Injectable()
export class KorisnikService {
  constructor(
    @InjectRepository(Korisnik)
    private readonly korisnikRepository: Repository<Korisnik>,
    @InjectRepository(StanarStana)
    private readonly stanarStanaRepository: Repository<StanarStana>,
    @InjectRepository(Zgrada)
    private readonly zgradaRepository: Repository<Zgrada>,
    @InjectRepository(ServiserSpecijalnost)
    private readonly specijalnostRepository: Repository<ServiserSpecijalnost>,
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
    const vlasnickiStanovi = veze
      .filter((v) => v.vlasnik)
      .map((v) => ({ id: v.stan.id, zgradaId: v.stan.zgrada.id }));
    const poseduje = [...new Set(vlasnickiStanovi.map((s) => s.zgradaId))];
    if (uloga === Uloga.ADMIN) {
      const aktivne = await this.zgradaRepository.find({
        where: AKTIVNA_ZGRADA,
        select: { id: true },
      });
      const sve = aktivne.map((z) => z.id);
      return {
        stanuje,
        poseduje,
        vlasnickiStanovi,
        zgrade: sve,
        upravlja: sve,
      };
    }
    const zgradaUpravnika =
      uloga === Uloga.UPRAVNIK ? await this.zgradaUpravnika(korisnikId) : null;
    const upravlja = zgradaUpravnika === null ? [] : [zgradaUpravnika];
    const zgrade = [...new Set([...stanuje, ...upravlja])];
    return { stanuje, poseduje, vlasnickiStanovi, zgrade, upravlja };
  }

  async proveriUpravnikaZgrade(
    korisnikId: number,
    uloga: Uloga,
    zgradaId: number,
    poruka: string,
  ) {
    await proveriAktivnu(this.zgradaRepository.manager, zgradaId);
    const p = await this.pristupZgradama(korisnikId, uloga);
    if (!sadrzi(p.upravlja, zgradaId)) {
      throw new ForbiddenException(poruka);
    }
  }

  async findAll({ pretraga, uloga, stanje, ...strana }: KorisnikUpitDto) {
    const upit = this.korisnikRepository
      .createQueryBuilder('korisnik')
      .leftJoin('korisnik.zgrada', 'zgrada')
      .select([
        'korisnik.id',
        'korisnik.ime',
        'korisnik.prezime',
        'korisnik.email',
        'korisnik.telefon',
        'korisnik.uloga',
        'korisnik.deaktiviran',
        'zgrada.id',
        'zgrada.naziv',
      ])
      .where(
        stanje === StanjeNaloga.AKTIVNI
          ? 'korisnik.deaktiviran IS NULL'
          : 'korisnik.deaktiviran IS NOT NULL',
      )
      .orderBy('korisnik.prezime')
      .addOrderBy('korisnik.ime')
      .addOrderBy('korisnik.id');
    if (pretraga) {
      const tekst = `%${pretraga.replace(/[\\%_]/g, '\\$&')}%`;
      upit.andWhere(
        new Brackets((qb) =>
          qb
            .where("korisnik.ime || ' ' || korisnik.prezime ILIKE :tekst")
            .orWhere("korisnik.prezime || ' ' || korisnik.ime ILIKE :tekst")
            .orWhere('korisnik.email ILIKE :tekst'),
        ),
        { tekst },
      );
    }
    if (uloga?.length) {
      upit.andWhere('korisnik.uloga IN (:...uloga)', { uloga });
    }
    const { skip, take } = stranicenje(strana);
    const [korisnici, ukupno] = await upit
      .skip(skip)
      .take(take)
      .getManyAndCount();

    const ids = korisnici.map((k) => k.id);
    const [veze, specijalnosti] = ids.length
      ? await Promise.all([
          this.stanarStanaRepository.find({
            where: { korisnik: { id: In(ids) } },
            relations: { korisnik: true, stan: { zgrada: true } },
            select: {
              id: true,
              vlasnik: true,
              korisnik: { id: true },
              stan: { id: true, broj: true, zgrada: { id: true, naziv: true } },
            },
            order: { stan: { zgrada: { naziv: 'ASC' }, broj: 'ASC' } },
          }),
          this.specijalnostRepository.find({
            where: { korisnik: { id: In(ids) } },
            relations: { korisnik: true },
            select: { id: true, kategorija: true, korisnik: { id: true } },
            order: { kategorija: 'ASC' },
          }),
        ])
      : [[], []];

    const stanovi = poKorisniku(veze, (v) => ({
      id: v.stan.id,
      broj: v.stan.broj,
      vlasnik: v.vlasnik,
      zgrada: v.stan.zgrada,
    }));
    const struke = poKorisniku(specijalnosti, (sp) => sp.kategorija);
    const stavke = korisnici.map((k) => ({
      id: k.id,
      ime: k.ime,
      prezime: k.prezime,
      email: k.email,
      telefon: k.telefon,
      uloga: k.uloga,
      deaktiviran: k.deaktiviran,
      zgrada: k.zgrada,
      stanovi: stanovi.get(k.id) ?? [],
      specijalnosti: struke.get(k.id) ?? [],
    }));
    return { stavke, ukupno } satisfies Stranica<(typeof stavke)[number]>;
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
