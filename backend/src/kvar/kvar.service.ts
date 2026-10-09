import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateKvarDto } from './dto/create-kvar.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Kvar } from './kvar.entity.js';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Stan } from '../stan/stan.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
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
import { UpdateStatusKvarDto } from './dto/update-status-kvar.dto.js';
import { ServiserSpecijalnost } from '../serviser-specijalnost/serviser-specijalnost.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { KvarUpitDto } from './dto/kvar-upit.dto.js';
import { Stranica, stranicenje } from '../shared/stranicenje.js';

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

@Injectable()
export class KvarService {
  constructor(
    @InjectRepository(Kvar) private kvarRepository: Repository<Kvar>,
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
    @InjectRepository(ServiserSpecijalnost)
    private serviserSpecijanostRepository: Repository<ServiserSpecijalnost>,
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
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
    if (vidljivi === null) {
      return { stavke: [], ukupno: 0 };
    }

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
  ): Promise<FindOptionsWhere<Kvar>[] | null> {
    switch (uloga) {
      case Uloga.ADMIN:
        return [zgradaId ? { zgrada: { id: zgradaId } } : {}];

      case Uloga.UPRAVNIK: {
        const zgradaUpravnika =
          await this.korisnikService.zgradaUpravnika(korisnikId);
        return zgradaUpravnika === null
          ? null
          : [{ zgrada: { id: zgradaUpravnika } }];
      }

      case Uloga.SERVISER:
        return [{ serviser: { id: korisnikId } }];

      default: {
        const veze = await this.stanarStanaRepository.find({
          where: { korisnik: { id: korisnikId } },
          relations: { stan: { zgrada: true } },
        });
        if (veze.length === 0) {
          return null;
        }
        const stanIds = veze.map((v) => v.stan.id);
        const zgradaIds = [...new Set(veze.map((v) => v.stan.zgrada.id))];
        return [
          { stan: { id: In(stanIds) } },
          {
            zgrada: { id: In(zgradaIds) },
            lokacijaTip: LokacijaTip.ZAJEDNICKI_PROSTOR,
          },
          { korisnik: { id: korisnikId } },
        ];
      }
    }
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
          kvar.zgrada.id
        );

      case Uloga.SERVISER:
        return kvar.serviser?.id === korisnikId;

      case Uloga.STANAR:
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

      default:
        return false;
    }
  }

  // Admin ili upravnik zgrade u kojoj je kvar; koriste ga i komentari i slike
  async smeDaUpravlja(
    kvar: Kvar,
    korisnikId: number,
    uloga: Uloga,
  ): Promise<boolean> {
    if (uloga === Uloga.ADMIN) {
      return true;
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

  async findDostupneServisere(kategorija: KategorijaKvara) {
    const specijalnosti = await this.serviserSpecijanostRepository.find({
      where: { kategorija },
      relations: { korisnik: true },
    });
    return specijalnosti.map((s) => s.korisnik);
  }

  async prihvati(id: number, korisnikId: number, uloga: Uloga) {
    const kvar = await this.findOne(id);
    await this.proveriUpravljanje(kvar, korisnikId, uloga);
    if (kvar.status !== StatusKvara.PRIJAVLJEN) {
      throw new BadRequestException(
        `Samo prijavljeni kvarovi mogu biti prihvaceni!`,
      );
    }
    kvar.status = StatusKvara.PRIHVACEN;
    return await this.kvarRepository.save(kvar);
  }

  async odbij(id: number, korisnikId: number, uloga: Uloga) {
    const kvar = await this.findOne(id);
    await this.proveriUpravljanje(kvar, korisnikId, uloga);
    if (kvar.status !== StatusKvara.PRIJAVLJEN) {
      throw new BadRequestException(
        `Samo prijavljeni kvarovi mogu biti odbijeni!`,
      );
    }
    kvar.status = StatusKvara.ODBIJEN;
    return await this.kvarRepository.save(kvar);
  }

  async postaviPrioritet(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: PostaviPrioritetDto,
  ) {
    const kvar = await this.findOne(id);
    await this.proveriUpravljanje(kvar, korisnikId, uloga);
    kvar.prioritet = dto.prioritetKvara;
    return await this.kvarRepository.save(kvar);
  }

  async dodeliServisera(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: DodeliServiseraDto,
  ) {
    const kvar = await this.findOne(id);
    await this.proveriUpravljanje(kvar, korisnikId, uloga);
    if (kvar.status !== StatusKvara.PRIHVACEN) {
      throw new BadRequestException(
        `Kvar mora biti prihvacen pre dodele servisera!`,
      );
    }
    const serviser = await this.korisnikRepository.findOne({
      where: { id: dto.serviserId },
    });
    if (!serviser || serviser.uloga !== Uloga.SERVISER) {
      throw new NotFoundException(
        `Serviser sa id-jem ${dto.serviserId} ne postoji!`,
      );
    }
    kvar.serviser = serviser;
    kvar.status = StatusKvara.DODELJEN;
    return await this.kvarRepository.save(kvar);
  }

  async promeniStatus(
    id: number,
    korisnikId: number,
    dto: UpdateStatusKvarDto,
  ) {
    const kvar = await this.findOne(id);
    if (kvar.serviser?.id !== korisnikId) {
      throw new ForbiddenException(
        `Samo dodeljeni serviser moze menjati status ovog kvara!`,
      );
    }
    const dozvoljeniPrelazi: Record<string, StatusKvara[]> = {
      [StatusKvara.DODELJEN]: [StatusKvara.U_TOKU],
      [StatusKvara.U_TOKU]: [StatusKvara.RESEN],
    };
    const dozvoljeni = dozvoljeniPrelazi[kvar.status] ?? [];
    if (!dozvoljeni.includes(dto.status)) {
      throw new BadRequestException(
        `Nije moguc prelaz iz statusa ${kvar.status} u ${dto.status}`,
      );
    }
    kvar.status = dto.status;
    return await this.kvarRepository.save(kvar);
  }

  async zatvori(id: number, korisnikId: number, uloga: Uloga) {
    const kvar = await this.findOne(id);
    await this.proveriUpravljanje(kvar, korisnikId, uloga);
    if (kvar.status !== StatusKvara.RESEN) {
      throw new BadRequestException('Samo resen kvar moze biti zatvoren.');
    }
    kvar.status = StatusKvara.ZATVOREN;
    return await this.kvarRepository.save(kvar);
  }
}
