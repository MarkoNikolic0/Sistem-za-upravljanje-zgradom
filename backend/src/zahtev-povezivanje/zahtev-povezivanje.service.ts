import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';
import { jeDupliUnos } from '../shared/greske-baze.js';
import { ZahtevPovezivanje } from './zahtev-povezivanje.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { AKTIVNA_ZGRADA } from '../zgrada/aktivna-zgrada.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { CreateZahtevDto } from './dto/create-zahtev.dto.js';
import { StatusZahteva } from '../shared/enums/status-zahteva.enum.js';
import { ResponseZahtevDto } from './dto/response-zahtev.dto.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import { Stranica, stranicenje } from '../shared/stranicenje.js';
import { ZahtevUpitDto } from './dto/zahtev-upit.dto.js';
import { NotifikacijaService } from '../notifikacija/notifikacija.service.js';
import { TipNotifikacije } from '../notifikacija/notifikacija.entity.js';
import { upravnikZgrade } from '../notifikacija/primaoci.js';
import { tekstObrade } from './odbij-zahteve.js';

@Injectable()
export class ZahtevPovezivanjeService {
  constructor(
    @InjectRepository(ZahtevPovezivanje)
    private zahtevRepository: Repository<ZahtevPovezivanje>,
    @InjectRepository(Stan) private stanRepository: Repository<Stan>,
    @InjectRepository(StanarStana)
    private stanarStanaRepository: Repository<StanarStana>,
    private dataSource: DataSource,
    private korisnikService: KorisnikService,
    private notifikacije: NotifikacijaService,
  ) {}

  async create(korisnikId: number, dto: CreateZahtevDto) {
    const stan = await this.stanRepository.findOne({
      where: { id: dto.stanId, zgrada: AKTIVNA_ZGRADA },
      relations: { zgrada: true },
    });
    if (!stan) {
      throw new NotFoundException(`Stan sa id-jem ${dto.stanId} ne postoji!`);
    }

    const vecPovezan = await this.stanarStanaRepository.exists({
      where: { korisnik: { id: korisnikId }, stan: { id: dto.stanId } },
    });
    if (vecPovezan) {
      throw new ConflictException('Već ste povezani sa ovim stanom!');
    }

    const zahtev = this.zahtevRepository.create({
      korisnik: { id: korisnikId } as Korisnik,
      stan,
    });

    try {
      return await this.dataSource.transaction(async (manager) => {
        const sacuvan = await manager.save(zahtev);
        await this.notifikacije.obavesti(
          manager,
          await upravnikZgrade(manager, stan.zgrada.id),
          {
            tip: TipNotifikacije.ZAHTEV_NOVI,
            tekst: `Nov zahtev za povezivanje sa stanom ${stan.broj}.`,
            link: '/zahtevi',
          },
        );
        return sacuvan;
      });
    } catch (greska) {
      if (jeDupliUnos(greska)) {
        throw new ConflictException(
          'Već imate zahtev na čekanju za ovaj stan!',
        );
      }
      throw greska;
    }
  }

  async findZaObradu(
    korisnikId: number,
    uloga: Uloga,
    upit: ZahtevUpitDto,
  ): Promise<Stranica<ZahtevPovezivanje>> {
    const where: FindOptionsWhere<ZahtevPovezivanje> = upit.status
      ? { status: upit.status }
      : {};

    if (uloga === Uloga.ADMIN) {
      where.stan = { zgrada: AKTIVNA_ZGRADA };
    } else {
      const zgrade = await this.korisnikService.zgradeUpravnika(korisnikId);
      if (zgrade.length === 0) {
        return { stavke: [], ukupno: 0 };
      }
      where.stan = { zgrada: { id: In(zgrade) } };
    }

    const [stavke, ukupno] = await this.zahtevRepository.findAndCount({
      where,
      relations: { korisnik: true, stan: { zgrada: true } },
      order: { datumPodnosenjaZahteva: 'DESC', id: 'DESC' },
      ...stranicenje(upit),
    });

    return { stavke, ukupno };
  }

  async zahtevResponse(
    zahtevId: number,
    korisnikId: number,
    uloga: Uloga,
    dto: ResponseZahtevDto,
  ) {
    const zahtev = await this.zahtevRepository.findOne({
      where: { id: zahtevId },
      relations: { korisnik: true, stan: { zgrada: true } },
    });
    if (!zahtev) {
      throw new NotFoundException(`Zahtev sa id-jem ${zahtevId} ne postoji!`);
    }

    await this.korisnikService.proveriUpravnikaZgrade(
      korisnikId,
      uloga,
      zahtev.stan.zgrada.id,
      'Možete obrađivati samo zahteve za svoju zgradu!',
    );
    const razlogOdbijanja =
      dto.status === StatusZahteva.ODBIJEN && dto.razlog ? dto.razlog : null;

    return await this.dataSource.transaction(async (manager) => {
      const rezultat = await manager.update(
        ZahtevPovezivanje,
        { id: zahtevId, status: StatusZahteva.NA_CEKANJU },
        { status: dto.status, razlogOdbijanja },
      );
      if (rezultat.affected === 0) {
        throw new ConflictException('Zahtev je već obrađen.');
      }

      if (dto.status === StatusZahteva.PRIHVACEN) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(StanarStana)
          .values({
            korisnik: { id: zahtev.korisnik.id },
            stan: { id: zahtev.stan.id },
            vlasnik: dto.vlasnik ?? false,
          })
          .orIgnore()
          .execute();
      }
      await this.notifikacije.obavesti(
        manager,
        [zahtev.korisnik.id],
        {
          tip: TipNotifikacije.ZAHTEV_OBRADJEN,
          tekst: tekstObrade(zahtev.stan.broj, dto.status, razlogOdbijanja),
          link: '/povezivanje',
        },
        korisnikId,
      );

      return Object.assign(zahtev, { status: dto.status, razlogOdbijanja });
    });
  }

  async findMoji(korisnikId: number) {
    return await this.zahtevRepository.find({
      where: { korisnik: { id: korisnikId } },
      relations: { stan: { zgrada: true } },
      order: { datumPodnosenjaZahteva: 'DESC' },
    });
  }
}
