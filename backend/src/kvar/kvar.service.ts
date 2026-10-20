import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateKvarDto } from './dto/create-kvar.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Kvar } from './kvar.entity.js';
import { DataSource, In, Repository } from 'typeorm';
import {
  KategorijaKvara,
  LokacijaTip,
  Prioritet,
  StatusKvara,
} from '../shared/enums/kvar.enums.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { ServiserSpecijalnost } from '../serviser-specijalnost/serviser-specijalnost.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { KvarUpitDto } from './dto/kvar-upit.dto.js';
import { Stranica, stranicenje } from '../shared/stranicenje.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { PromenaStatusaKvara } from './promena-statusa-kvara.entity.js';
import { KvarPravaService } from './kvar-prava.service.js';
import {
  DANA_ZA_POTVRDU,
  MAKS_SLICNIH,
  OTVORENI_STATUSI,
  rokResavanja,
  STATUSI_PO_STANJU,
} from './kvar.constants.js';
import { MS_PO_DANU } from '../shared/vreme.js';
import { PratilacKvara } from '../pratilac-kvara/pratilac-kvara.entity.js';
import { SlicniKvaroviUpitDto } from './dto/slicni-kvarovi-upit.dto.js';

@Injectable()
export class KvarService {
  constructor(
    @InjectRepository(Kvar) private kvarRepository: Repository<Kvar>,
    @InjectRepository(ServiserSpecijalnost)
    private serviserSpecijalnostRepository: Repository<ServiserSpecijalnost>,
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
    @InjectRepository(PromenaStatusaKvara)
    private promenaRepository: Repository<PromenaStatusaKvara>,
    @InjectRepository(PratilacKvara)
    private pratilacRepository: Repository<PratilacKvara>,
    private prava: KvarPravaService,
    private dataSource: DataSource,
  ) {}

  async create(korisnikId: number, dto: CreateKvarDto) {
    const veza = await this.vezaSaStanom(korisnikId, dto.stanId);
    if (!veza) {
      throw new ForbiddenException('Niste povezani sa ovim stanom!');
    }

    const prioritet = dto.prioritet ?? Prioritet.SREDNJE;
    const kvar = this.kvarRepository.create({
      naslov: dto.naslov,
      opis: dto.opis,
      kategorija: dto.kategorija,
      lokacijaTip: dto.lokacijaTip,
      prioritet,
      rokResavanja: rokResavanja(new Date(), prioritet),
      stan:
        dto.lokacijaTip === LokacijaTip.PRIVATNI_STAN ? veza.stan : undefined,
      zgrada: veza.stan.zgrada,
      korisnik: veza.korisnik,
    });

    return await this.dataSource.transaction(async (manager) => {
      const sacuvan = await manager.save(kvar);
      await manager.insert(PromenaStatusaKvara, {
        kvar: { id: sacuvan.id },
        status: StatusKvara.PRIJAVLJEN,
        korisnik: { id: korisnikId },
      });
      return sacuvan;
    });
  }

  private async vezaSaStanom(korisnikId: number, stanId: number) {
    const veza = await this.stanarStanaRepository.findOne({
      where: { korisnik: { id: korisnikId }, stan: { id: stanId } },
      relations: { korisnik: true, stan: { zgrada: true } },
    });
    if (!veza) {
      throw new ForbiddenException('Niste povezani sa ovim stanom!');
    }
    return veza;
  }

  async findAllZaKorisnika(
    korisnikId: number,
    uloga: Uloga,
    upit: KvarUpitDto,
  ): Promise<Stranica<Kvar>> {
    const vidljivi = await this.prava.usloviVidljivosti(
      korisnikId,
      uloga,
      upit.zgradaId,
    );

    const status = In(STATUSI_PO_STANJU[upit.stanje]);
    const [stavke, ukupno] = await this.kvarRepository.findAndCount({
      where: vidljivi.map((uslov) => ({ ...uslov, status })),
      relations: { zgrada: true, stan: true, korisnik: true, serviser: true },
      order: { datumPrijave: 'DESC', id: 'DESC' },
      ...stranicenje(upit),
    });

    return { stavke, ukupno };
  }

  async findSlicne(korisnikId: number, upit: SlicniKvaroviUpitDto) {
    const veza = await this.vezaSaStanom(korisnikId, upit.stanId);
    const slicni = await this.kvarRepository.find({
      where: {
        zgrada: { id: veza.stan.zgrada.id },
        lokacijaTip: LokacijaTip.ZAJEDNICKI_PROSTOR,
        kategorija: upit.kategorija,
        status: In(OTVORENI_STATUSI),
      },
      relations: { korisnik: true },
      order: { datumPrijave: 'DESC', id: 'DESC' },
      take: MAKS_SLICNIH,
    });

    const praceni = await this.pratilacRepository.find({
      where: {
        korisnik: { id: korisnikId },
        kvar: { id: In(slicni.map((k) => k.id)) },
      },
      relations: { kvar: true },
    });
    const praceniIds = new Set(praceni.map((p) => p.kvar.id));
    return slicni.map((kvar) =>
      Object.assign(kvar, { pratim: praceniIds.has(kvar.id) }),
    );
  }

  async findOne(id: number) {
    const kvar = await this.kvarRepository.findOne({
      where: { id },
      relations: { zgrada: true, stan: true, korisnik: true, serviser: true },
    });
    if (!kvar) {
      throw new NotFoundException(`Kvar sa id-jem ${id} ne postoji!`);
    }
    return kvar;
  }

  async findDostupan(id: number, korisnikId: number, uloga: Uloga) {
    const kvar = await this.findOne(id);
    if (!(await this.prava.smeDaVidi(kvar, korisnikId, uloga))) {
      throw new ForbiddenException('Nemate pristup ovom kvaru!');
    }
    return kvar;
  }

  async findDetalj(id: number, korisnikId: number, uloga: Uloga) {
    const kvar = await this.findDostupan(id, korisnikId, uloga);
    const [smeDaUpravlja, smeDaPotvrdi, smeDaPrati, pratim, istorija] =
      await Promise.all([
        this.prava.smeDaUpravlja(kvar, korisnikId, uloga),
        this.prava.smeDaPotvrdi(kvar, korisnikId),
        OTVORENI_STATUSI.includes(kvar.status) &&
          this.prava.smeDaPrati(kvar, korisnikId),
        this.pratilacRepository.exists({
          where: { kvar: { id }, korisnik: { id: korisnikId } },
        }),
        this.promenaRepository.find({
          where: { kvar: { id } },
          relations: { korisnik: true, komentar: true },
          order: { datum: 'ASC', id: 'ASC' },
        }),
      ]);
    return Object.assign(kvar, {
      smeDaUpravlja,
      smeDaPotvrdi,
      smeDaPrati,
      pratim,
      rokPotvrde:
        kvar.status === StatusKvara.RESEN && kvar.datumResenja
          ? new Date(kvar.datumResenja.getTime() + DANA_ZA_POTVRDU * MS_PO_DANU)
          : null,
      istorija,
    });
  }

  async findZgradeSaKvarovima(korisnikId: number, uloga: Uloga) {
    const upit = this.zgradaRepository
      .createQueryBuilder('zgrada')
      .innerJoin(Kvar, 'kvar', 'kvar.zgrada = zgrada.id')
      .orderBy('zgrada.naziv', 'ASC');
    if (uloga === Uloga.SERVISER) {
      upit.where('kvar.serviser = :korisnikId', { korisnikId });
    }
    return await upit.getMany();
  }

  async findDostupneServisere(kategorija: KategorijaKvara) {
    const specijalnosti = await this.serviserSpecijalnostRepository.find({
      where: { kategorija, korisnik: { uloga: Uloga.SERVISER } },
      relations: { korisnik: true },
      order: { korisnik: { prezime: 'ASC', ime: 'ASC' } },
    });
    return specijalnosti.map((s) => s.korisnik);
  }
}
