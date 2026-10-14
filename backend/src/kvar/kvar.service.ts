import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateKvarDto } from './dto/create-kvar.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Kvar } from './kvar.entity.js';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import {
  KategorijaKvara,
  LokacijaTip,
  Prioritet,
  StanjeKvara,
  StatusKvara,
} from '../shared/enums/kvar.enums.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { PostaviPrioritetDto } from './dto/postavi-prioritet.dto.js';
import { DodeliServiseraDto } from './dto/dodeli-servisera.dto.js';
import {
  StatusRadaServisera,
  UpdateStatusKvarDto,
} from './dto/update-status-kvar.dto.js';
import { ServiserSpecijalnost } from '../serviser-specijalnost/serviser-specijalnost.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { KvarUpitDto } from './dto/kvar-upit.dto.js';
import { Stranica, stranicenje } from '../shared/stranicenje.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';

const STATUSI_PO_STANJU: Record<StanjeKvara, StatusKvara[]> = {
  [StanjeKvara.AKTIVNI]: [
    StatusKvara.PRIJAVLJEN,
    StatusKvara.PRIHVACEN,
    StatusKvara.DODELJEN,
    StatusKvara.U_TOKU,
    StatusKvara.RESEN,
  ],
  [StanjeKvara.ZAVRSENI]: [StatusKvara.ZATVOREN, StatusKvara.ODBIJEN],
};

const PRETHODNI_STATUS: Record<StatusRadaServisera, StatusKvara> = {
  [StatusKvara.U_TOKU]: StatusKvara.DODELJEN,
  [StatusKvara.RESEN]: StatusKvara.U_TOKU,
};

@Injectable()
export class KvarService {
  constructor(
    @InjectRepository(Kvar) private kvarRepository: Repository<Kvar>,
    @InjectRepository(ServiserSpecijalnost)
    private serviserSpecijanostRepository: Repository<ServiserSpecijalnost>,
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
    private korisnikService: KorisnikService,
  ) {}

  async create(korisnikId: number, dto: CreateKvarDto) {
    const veza = await this.stanarStanaRepository.findOne({
      where: { korisnik: { id: korisnikId }, stan: { id: dto.stanId } },
      relations: { korisnik: true, stan: { zgrada: true } },
    });
    if (!veza) {
      throw new ForbiddenException('Niste povezani sa ovim stanom!');
    }

    const kvar = this.kvarRepository.create({
      naslov: dto.naslov,
      opis: dto.opis,
      kategorija: dto.kategorija,
      lokacijaTip: dto.lokacijaTip,
      prioritet: dto.prioritet ?? Prioritet.SREDNJE,
      stan:
        dto.lokacijaTip === LokacijaTip.PRIVATNI_STAN ? veza.stan : undefined,
      zgrada: veza.stan.zgrada,
      korisnik: veza.korisnik,
    });

    return await this.kvarRepository.save(kvar);
  }

  async findAllZaKorisnika(
    korisnikId: number,
    uloga: Uloga,
    upit: KvarUpitDto,
  ): Promise<Stranica<Kvar>> {
    const vidljivi = await this.usloviVidljivosti(
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

  private async usloviVidljivosti(
    korisnikId: number,
    uloga: Uloga,
    zgradaId?: number,
  ): Promise<FindOptionsWhere<Kvar>[]> {
    switch (uloga) {
      case Uloga.ADMIN:
        return [zgradaId ? { zgrada: { id: zgradaId } } : {}];

      case Uloga.UPRAVNIK: {
        const zgradaUpravnika =
          await this.korisnikService.zgradaUpravnika(korisnikId);
        const uslovi = await this.usloviStanara(korisnikId);
        return zgradaUpravnika === null
          ? uslovi
          : [{ zgrada: { id: zgradaUpravnika } }, ...uslovi];
      }

      case Uloga.SERVISER:
        return [
          {
            serviser: { id: korisnikId },
            ...(zgradaId ? { zgrada: { id: zgradaId } } : {}),
          },
        ];

      default:
        return await this.usloviStanara(korisnikId);
    }
  }

  private async usloviStanara(
    korisnikId: number,
  ): Promise<FindOptionsWhere<Kvar>[]> {
    const sopstveni: FindOptionsWhere<Kvar> = { korisnik: { id: korisnikId } };
    const veze = await this.stanarStanaRepository.find({
      where: { korisnik: { id: korisnikId } },
      relations: { stan: { zgrada: true } },
    });
    if (veze.length === 0) {
      return [sopstveni];
    }
    const stanIds = veze.map((v) => v.stan.id);
    const zgradaIds = [...new Set(veze.map((v) => v.stan.zgrada.id))];
    return [
      { stan: { id: In(stanIds) } },
      {
        zgrada: { id: In(zgradaIds) },
        lokacijaTip: LokacijaTip.ZAJEDNICKI_PROSTOR,
      },
      sopstveni,
    ];
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
    if (!(await this.smeDaVidi(kvar, korisnikId, uloga))) {
      throw new ForbiddenException('Nemate pristup ovom kvaru!');
    }
    return kvar;
  }

  async findDetalj(id: number, korisnikId: number, uloga: Uloga) {
    const kvar = await this.findDostupan(id, korisnikId, uloga);
    return Object.assign(kvar, {
      smeDaUpravlja: await this.smeDaUpravlja(kvar, korisnikId, uloga),
    });
  }

  private async smeDaVidi(
    kvar: Kvar,
    korisnikId: number,
    uloga: Uloga,
  ): Promise<boolean> {
    switch (uloga) {
      case Uloga.ADMIN:
        return true;

      case Uloga.UPRAVNIK:
        return (
          (await this.korisnikService.zgradaUpravnika(korisnikId)) ===
            kvar.zgrada.id || (await this.smeKaoStanar(kvar, korisnikId))
        );

      case Uloga.SERVISER:
        return kvar.serviser?.id === korisnikId;

      case Uloga.STANAR:
        return await this.smeKaoStanar(kvar, korisnikId);

      default:
        return false;
    }
  }

  private async smeKaoStanar(kvar: Kvar, korisnikId: number): Promise<boolean> {
    if (kvar.korisnik.id === korisnikId) {
      return true;
    }
    if (kvar.stan) {
      return await this.stanarStanaRepository.exists({
        where: { korisnik: { id: korisnikId }, stan: { id: kvar.stan.id } },
      });
    }
    return await this.stanarStanaRepository.exists({
      where: {
        korisnik: { id: korisnikId },
        stan: { zgrada: { id: kvar.zgrada.id } },
      },
    });
  }

  async smeDaUpravlja(
    kvar: Kvar,
    korisnikId: number,
    uloga: Uloga,
  ): Promise<boolean> {
    if (uloga === Uloga.ADMIN) {
      return true;
    }
    if (uloga !== Uloga.UPRAVNIK) {
      return false;
    }
    const zgradaUpravnika =
      await this.korisnikService.zgradaUpravnika(korisnikId);
    return zgradaUpravnika === kvar.zgrada.id;
  }

  private async proveriUpravljanje(
    kvar: Kvar,
    korisnikId: number,
    uloga: Uloga,
  ) {
    if (!(await this.smeDaUpravlja(kvar, korisnikId, uloga))) {
      throw new ForbiddenException(
        'Možete upravljati samo kvarovima svoje zgrade!',
      );
    }
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
    const specijalnosti = await this.serviserSpecijanostRepository.find({
      where: { kategorija, korisnik: { uloga: Uloga.SERVISER } },
      relations: { korisnik: true },
      order: { korisnik: { prezime: 'ASC', ime: 'ASC' } },
    });
    return specijalnosti.map((s) => s.korisnik);
  }

  async prihvati(id: number, korisnikId: number, uloga: Uloga) {
    const kvar = await this.findOne(id);
    await this.proveriUpravljanje(kvar, korisnikId, uloga);
    await this.izmeniAkoJeU(id, [StatusKvara.PRIJAVLJEN], {
      status: StatusKvara.PRIHVACEN,
    });
    return await this.findDetalj(id, korisnikId, uloga);
  }

  async odbij(id: number, korisnikId: number, uloga: Uloga) {
    const kvar = await this.findOne(id);
    await this.proveriUpravljanje(kvar, korisnikId, uloga);
    await this.izmeniAkoJeU(id, [StatusKvara.PRIJAVLJEN], {
      status: StatusKvara.ODBIJEN,
    });
    return await this.findDetalj(id, korisnikId, uloga);
  }

  async postaviPrioritet(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: PostaviPrioritetDto,
  ) {
    const kvar = await this.findOne(id);
    await this.proveriUpravljanje(kvar, korisnikId, uloga);
    await this.izmeniAkoJeU(id, STATUSI_PO_STANJU[StanjeKvara.AKTIVNI], {
      prioritet: dto.prioritet,
    });
    return await this.findDetalj(id, korisnikId, uloga);
  }

  async dodeliServisera(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: DodeliServiseraDto,
  ) {
    const kvar = await this.findOne(id);
    await this.proveriUpravljanje(kvar, korisnikId, uloga);
    const imaStruku = await this.serviserSpecijanostRepository.exists({
      where: {
        korisnik: { id: dto.serviserId, uloga: Uloga.SERVISER },
        kategorija: kvar.kategorija,
      },
    });
    if (!imaStruku) {
      throw new BadRequestException(
        'Izabrani serviser nema struku za ovu vrstu kvara.',
      );
    }
    await this.izmeniAkoJeU(id, [StatusKvara.PRIHVACEN, StatusKvara.DODELJEN], {
      status: StatusKvara.DODELJEN,
      serviser: { id: dto.serviserId },
    });
    return await this.findDetalj(id, korisnikId, uloga);
  }

  async promeniStatus(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: UpdateStatusKvarDto,
  ) {
    const kvar = await this.findOne(id);
    if (kvar.serviser?.id !== korisnikId) {
      throw new ForbiddenException(
        'Samo dodeljeni serviser može da menja status ovog kvara!',
      );
    }
    await this.izmeniAkoJeU(
      id,
      [PRETHODNI_STATUS[dto.status]],
      { status: dto.status },
      { serviser: { id: korisnikId } },
    );
    return await this.findDetalj(id, korisnikId, uloga);
  }

  async zatvori(id: number, korisnikId: number, uloga: Uloga) {
    const kvar = await this.findOne(id);
    await this.proveriUpravljanje(kvar, korisnikId, uloga);
    await this.izmeniAkoJeU(id, [StatusKvara.RESEN], {
      status: StatusKvara.ZATVOREN,
    });
    return await this.findDetalj(id, korisnikId, uloga);
  }

  private async izmeniAkoJeU(
    id: number,
    statusi: StatusKvara[],
    izmene: QueryDeepPartialEntity<Kvar>,
    uslov: FindOptionsWhere<Kvar> = {},
  ): Promise<void> {
    const rezultat = await this.kvarRepository.update(
      { ...uslov, id, status: In(statusi) },
      izmene,
    );
    if (rezultat.affected === 0) {
      throw new ConflictException(
        'Akcija nije moguća u trenutnom statusu kvara. Osveži stranicu.',
      );
    }
  }
}
