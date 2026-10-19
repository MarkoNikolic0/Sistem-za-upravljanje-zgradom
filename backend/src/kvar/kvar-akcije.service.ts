import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  LessThan,
  Repository,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Kvar } from './kvar.entity.js';
import { PromenaStatusaKvara } from './promena-statusa-kvara.entity.js';
import { KomentarKvar } from '../komentar-kvar/komentar-kvar.entity.js';
import { StanjeKvara, StatusKvara } from '../shared/enums/kvar.enums.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { ServiserSpecijalnost } from '../serviser-specijalnost/serviser-specijalnost.entity.js';
import { PostaviPrioritetDto } from './dto/postavi-prioritet.dto.js';
import { DodeliServiseraDto } from './dto/dodeli-servisera.dto.js';
import {
  StatusRadaServisera,
  UpdateStatusKvarDto,
} from './dto/update-status-kvar.dto.js';
import { VratiKvarDto } from './dto/vrati-kvar.dto.js';
import { KvarService } from './kvar.service.js';
import { KvarPravaService } from './kvar-prava.service.js';
import {
  DANA_ZA_POTVRDU,
  rokResavanja,
  STATUSI_PO_STANJU,
} from './kvar.constants.js';
import { MS_PO_DANU } from '../shared/vreme.js';
import { PostaviDolazakDto } from './dto/postavi-dolazak.dto.js';

const PRETHODNI_STATUS: Record<StatusRadaServisera, StatusKvara> = {
  [StatusKvara.U_TOKU]: StatusKvara.DODELJEN,
  [StatusKvara.RESEN]: StatusKvara.U_TOKU,
};

interface Prelaz {
  izmene?: QueryDeepPartialEntity<Kvar>;
  uslov?: FindOptionsWhere<Kvar>;
  komentar?: string;
}

@Injectable()
export class KvarAkcijeService {
  private readonly logger = new Logger(KvarAkcijeService.name);
  constructor(
    @InjectRepository(Kvar) private kvarRepository: Repository<Kvar>,
    @InjectRepository(ServiserSpecijalnost)
    private serviserSpecijalnostRepository: Repository<ServiserSpecijalnost>,
    private kvarService: KvarService,
    private prava: KvarPravaService,
    private dataSource: DataSource,
  ) {}

  async prihvati(id: number, korisnikId: number, uloga: Uloga) {
    const kvar = await this.kvarService.findOne(id);
    await this.prava.proveriUpravljanje(kvar, korisnikId, uloga);
    await this.prelaz(
      id,
      [StatusKvara.PRIJAVLJEN],
      StatusKvara.PRIHVACEN,
      korisnikId,
    );
    return await this.kvarService.findDetalj(id, korisnikId, uloga);
  }

  async odbij(id: number, korisnikId: number, uloga: Uloga) {
    const kvar = await this.kvarService.findOne(id);
    await this.prava.proveriUpravljanje(kvar, korisnikId, uloga);
    await this.prelaz(
      id,
      [StatusKvara.PRIJAVLJEN],
      StatusKvara.ODBIJEN,
      korisnikId,
    );
    return await this.kvarService.findDetalj(id, korisnikId, uloga);
  }

  async postaviPrioritet(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: PostaviPrioritetDto,
  ) {
    const kvar = await this.kvarService.findOne(id);
    await this.prava.proveriUpravljanje(kvar, korisnikId, uloga);
    await this.izmeniAkoJeU(id, STATUSI_PO_STANJU[StanjeKvara.AKTIVNI], {
      prioritet: dto.prioritet,
      rokResavanja: rokResavanja(kvar.datumPrijave, dto.prioritet),
    });
    return await this.kvarService.findDetalj(id, korisnikId, uloga);
  }

  async dodeliServisera(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: DodeliServiseraDto,
  ) {
    const kvar = await this.kvarService.findOne(id);
    await this.prava.proveriUpravljanje(kvar, korisnikId, uloga);
    const imaStruku = await this.serviserSpecijalnostRepository.exists({
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
    await this.prelaz(
      id,
      [StatusKvara.PRIHVACEN, StatusKvara.DODELJEN],
      StatusKvara.DODELJEN,
      korisnikId,
      { izmene: { serviser: { id: dto.serviserId }, dolazakServisera: null } },
    );
    return await this.kvarService.findDetalj(id, korisnikId, uloga);
  }

  async promeniStatus(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: UpdateStatusKvarDto,
  ) {
    const kvar = await this.kvarService.findOne(id);
    this.prava.proveriServisera(kvar, korisnikId);
    await this.prelaz(
      id,
      [PRETHODNI_STATUS[dto.status]],
      dto.status,
      korisnikId,
      {
        izmene:
          dto.status === StatusKvara.RESEN
            ? { datumResenja: new Date(), dolazakServisera: null }
            : { datumResenja: null },
        uslov: { serviser: { id: korisnikId } },
      },
    );
    return await this.kvarService.findDetalj(id, korisnikId, uloga);
  }

  async postaviDolazak(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: PostaviDolazakDto,
  ) {
    const kvar = await this.kvarService.findOne(id);
    this.prava.proveriServisera(kvar, korisnikId);
    await this.izmeniAkoJeU(
      id,
      [StatusKvara.DODELJEN, StatusKvara.U_TOKU],
      { dolazakServisera: dto.dolazak },
      { serviser: { id: korisnikId } },
    );
    return await this.kvarService.findDetalj(id, korisnikId, uloga);
  }

  async potvrdi(id: number, korisnikId: number, uloga: Uloga) {
    const kvar = await this.kvarService.findOne(id);
    await this.prava.proveriPotvrdu(kvar, korisnikId);
    await this.prelaz(
      id,
      [StatusKvara.RESEN],
      StatusKvara.ZATVOREN,
      korisnikId,
    );
    return await this.kvarService.findDetalj(id, korisnikId, uloga);
  }

  async vrati(id: number, korisnikId: number, uloga: Uloga, dto: VratiKvarDto) {
    const kvar = await this.kvarService.findOne(id);
    await this.prava.proveriPotvrdu(kvar, korisnikId);
    await this.prelaz(id, [StatusKvara.RESEN], StatusKvara.U_TOKU, korisnikId, {
      izmene: { datumResenja: null },
      komentar: dto.tekst,
    });
    return await this.kvarService.findDetalj(id, korisnikId, uloga);
  }

  async zatvori(id: number, korisnikId: number, uloga: Uloga) {
    const kvar = await this.kvarService.findOne(id);
    await this.prava.proveriUpravljanje(kvar, korisnikId, uloga);
    await this.prelaz(
      id,
      [StatusKvara.RESEN],
      StatusKvara.ZATVOREN,
      korisnikId,
    );
    return await this.kvarService.findDetalj(id, korisnikId, uloga);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async zatvoriNepotvrdjene() {
    const rok = new Date(Date.now() - DANA_ZA_POTVRDU * MS_PO_DANU);
    const zatvoreni = await this.dataSource.transaction(async (manager) => {
      const rezultat = await manager
        .createQueryBuilder()
        .update(Kvar)
        .set({ status: StatusKvara.ZATVOREN })
        .where({ status: StatusKvara.RESEN, datumResenja: LessThan(rok) })
        .returning('id')
        .execute();
      const redovi = rezultat.raw as { id: number }[];
      if (redovi.length > 0) {
        await manager.insert(
          PromenaStatusaKvara,
          redovi.map(({ id }) => ({
            kvar: { id },
            status: StatusKvara.ZATVOREN,
          })),
        );
      }
      return redovi.length;
    });
    if (zatvoreni > 0) {
      this.logger.log(`Automatski zatvoreno kvarova: ${zatvoreni}`);
    }
  }

  private async prelaz(
    id: number,
    izStatusa: StatusKvara[],
    status: StatusKvara,
    korisnikId: number,
    { izmene = {}, uslov = {}, komentar }: Prelaz = {},
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.izmeniAkoJeU(
        id,
        izStatusa,
        { ...izmene, status },
        uslov,
        manager,
      );
      const sacuvanKomentar = komentar
        ? await manager.save(KomentarKvar, {
            tekst: komentar,
            kvar: { id },
            korisnik: { id: korisnikId },
          })
        : null;
      await manager.insert(PromenaStatusaKvara, {
        kvar: { id },
        status,
        korisnik: { id: korisnikId },
        komentar: sacuvanKomentar,
      });
    });
  }

  private async izmeniAkoJeU(
    id: number,
    statusi: StatusKvara[],
    izmene: QueryDeepPartialEntity<Kvar>,
    uslov: FindOptionsWhere<Kvar> = {},
    manager: EntityManager = this.kvarRepository.manager,
  ): Promise<void> {
    const rezultat = await manager.update(
      Kvar,
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
