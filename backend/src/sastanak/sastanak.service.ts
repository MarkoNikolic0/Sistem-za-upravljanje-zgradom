import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  IsNull,
  MoreThan,
  Raw,
  Repository,
  type FindOptionsWhere,
} from 'typeorm';
import { Sastanak } from './sastanak.entity.js';
import { TackaDnevnogReda } from './tacka-dnevnog-reda.entity.js';
import { Glasanje } from '../glasanje/glasanje.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { GlasanjeRezultatiService } from '../glasanje/glasanje-rezultati.service.js';
import { KorisnikService } from '../korisnik/korisnik.service.js';
import {
  type PristupZgradama,
  sadrzi,
  samoZgrada,
  zgradeVlasnika,
} from '../korisnik/pristup-zgradama.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { VrstaGlasanja } from '../shared/enums/glasanje.enums.js';
import {
  StanjeSastanka,
  VrstaSastanka,
} from '../shared/enums/sastanak.enums.js';
import { POCETAK_DANA, danaDo } from '../shared/vreme.js';
import { Stranica, stranicenje } from '../shared/stranicenje.js';
import { greskaPolja } from '../shared/greske-validacije.js';
import { CreateSastanakDto, TackaDto } from './dto/create-sastanak.dto.js';
import { UpdateSastanakDto } from './dto/update-sastanak.dto.js';
import { SastanakUpitDto } from './dto/sastanak-upit.dto.js';

// Zakon: obaveštenje o sednici skupštine najmanje tri dana pre, osim u hitnim slučajevima
export const DANA_ZA_POZIV = 3;

const PORUKA_PROSAO = 'Sastanak je već počeo ili je otkazan.';

function zgradeVrste(vrsta: VrstaSastanka, p: PristupZgradama) {
  return vrsta === VrstaSastanka.SKUPSTINA ? zgradeVlasnika(p) : p.zgrade;
}

@Injectable()
export class SastanakService {
  constructor(
    @InjectRepository(Sastanak)
    private sastanakRepository: Repository<Sastanak>,
    @InjectRepository(Glasanje)
    private glasanjeRepository: Repository<Glasanje>,
    @InjectRepository(Zgrada) private zgradaRepository: Repository<Zgrada>,
    private glasanjeRezultati: GlasanjeRezultatiService,
    private korisnikService: KorisnikService,
    private dataSource: DataSource,
  ) {}

  async findAll(
    korisnikId: number,
    uloga: Uloga,
    upit: SastanakUpitDto,
  ): Promise<Stranica<Sastanak>> {
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    const predstojeci = upit.stanje === StanjeSastanka.PREDSTOJECI;
    const pocetak = Raw((kolona) =>
      predstojeci
        ? `${kolona} >= ${POCETAK_DANA}`
        : `${kolona} < ${POCETAK_DANA}`,
    );

    const uslovi = Object.values(VrstaSastanka)
      .map((vrsta) => ({
        vrsta,
        zgrade: samoZgrada(zgradeVrste(vrsta, p), upit.zgradaId),
      }))
      .filter(({ zgrade }) => zgrade?.length !== 0)
      .map(({ vrsta, zgrade }): FindOptionsWhere<Sastanak> => ({
        vrsta,
        pocetak,
        ...(zgrade === null ? {} : { zgrada: { id: In(zgrade) } }),
      }));
    if (uslovi.length === 0) {
      return { stavke: [], ukupno: 0 };
    }

    const [stavke, ukupno] = await this.sastanakRepository.findAndCount({
      where: uslovi,
      relations: { zgrada: true, organizator: true, tacke: true },
      order: { pocetak: predstojeci ? 'ASC' : 'DESC', id: 'DESC' },
      ...stranicenje(upit),
    });
    return { stavke: stavke.map((s) => this.saPravima(s, p)), ukupno };
  }

  async findOne(id: number, korisnikId: number, uloga: Uloga) {
    const { sastanak, p } = await this.findDostupno(id, korisnikId, uloga);
    return this.saOdlukama(sastanak, korisnikId, p);
  }

  async create(korisnikId: number, uloga: Uloga, dto: CreateSastanakDto) {
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    if (!sadrzi(p.upravlja, dto.zgradaId)) {
      throw new ForbiddenException('Sastanak zakazuje upravnik zgrade.');
    }
    if (
      p.upravlja === null &&
      !(await this.zgradaRepository.existsBy({ id: dto.zgradaId }))
    ) {
      throw new NotFoundException(
        `Zgrada sa id-jem ${dto.zgradaId} ne postoji!`,
      );
    }
    const hitno = dto.hitno ?? false;
    this.proveriTermin(dto.vrsta, dto.pocetak, hitno);
    await this.proveriTacke(dto.vrsta, dto.tacke, dto.zgradaId);

    const { id } = await this.sastanakRepository.save(
      this.sastanakRepository.create({
        vrsta: dto.vrsta,
        naslov: dto.naslov,
        opis: dto.opis || null,
        pocetak: dto.pocetak,
        lokacija: dto.lokacija,
        hitno: this.hitno(dto.vrsta, hitno),
        zgrada: { id: dto.zgradaId },
        organizator: { id: korisnikId },
        tacke: this.noveTacke(dto.tacke),
      }),
    );
    return this.findOne(id, korisnikId, uloga);
  }

  async update(
    id: number,
    korisnikId: number,
    uloga: Uloga,
    dto: UpdateSastanakDto,
  ) {
    const { sastanak } = await this.findZaUpravljanje(id, korisnikId, uloga);
    const vrsta = dto.vrsta ?? sastanak.vrsta;
    const pocetak = dto.pocetak ?? sastanak.pocetak;
    const hitno = dto.hitno ?? sastanak.hitno;
    if (
      pocetak.getTime() !== sastanak.pocetak.getTime() ||
      vrsta !== sastanak.vrsta ||
      hitno !== sastanak.hitno
    ) {
      this.proveriTermin(vrsta, pocetak, hitno);
    }
    await this.proveriTacke(
      vrsta,
      dto.tacke ?? sastanak.tacke.map((t) => ({ odlukaId: t.odluka?.id })),
      sastanak.zgrada.id,
    );

    await this.dataSource.transaction(async (manager) => {
      const rezultat = await manager.update(
        Sastanak,
        { id, pocetak: MoreThan(new Date()), datumOtkazivanja: IsNull() },
        {
          vrsta,
          pocetak,
          hitno: this.hitno(vrsta, hitno),
          ...(dto.naslov !== undefined && { naslov: dto.naslov }),
          ...(dto.opis !== undefined && { opis: dto.opis || null }),
          ...(dto.lokacija !== undefined && { lokacija: dto.lokacija }),
        },
      );
      if (rezultat.affected === 0) {
        throw new ConflictException(PORUKA_PROSAO);
      }
      if (dto.tacke !== undefined) {
        await manager.delete(TackaDnevnogReda, { sastanak: { id } });
        await manager.insert(
          TackaDnevnogReda,
          this.noveTacke(dto.tacke).map((t) => ({ ...t, sastanak: { id } })),
        );
      }
    });
    return this.findOne(id, korisnikId, uloga);
  }

  async otkazi(id: number, korisnikId: number, uloga: Uloga, razlog: string) {
    await this.findZaUpravljanje(id, korisnikId, uloga);
    const rezultat = await this.sastanakRepository.update(
      { id, pocetak: MoreThan(new Date()), datumOtkazivanja: IsNull() },
      { datumOtkazivanja: new Date(), razlogOtkazivanja: razlog },
    );
    if (rezultat.affected === 0) {
      throw new ConflictException(PORUKA_PROSAO);
    }
    return this.findOne(id, korisnikId, uloga);
  }

  private async findDostupno(id: number, korisnikId: number, uloga: Uloga) {
    const sastanak = await this.sastanakRepository.findOne({
      where: { id },
      relations: {
        zgrada: true,
        organizator: true,
        tacke: { odluka: true },
      },
    });
    if (!sastanak) {
      throw new NotFoundException(`Sastanak sa id-jem ${id} ne postoji!`);
    }
    const p = await this.korisnikService.pristupZgradama(korisnikId, uloga);
    if (!sadrzi(zgradeVrste(sastanak.vrsta, p), sastanak.zgrada.id)) {
      throw new ForbiddenException('Nemate pristup ovom sastanku!');
    }
    return { sastanak, p };
  }

  private async findZaUpravljanje(
    id: number,
    korisnikId: number,
    uloga: Uloga,
  ) {
    const dostupno = await this.findDostupno(id, korisnikId, uloga);
    if (!sadrzi(dostupno.p.upravlja, dostupno.sastanak.zgrada.id)) {
      throw new ForbiddenException('Sastankom upravlja upravnik zgrade.');
    }
    return dostupno;
  }

  private proveriTermin(vrsta: VrstaSastanka, pocetak: Date, hitno: boolean) {
    if (pocetak <= new Date()) {
      throw greskaPolja('pocetak', 'Termin mora biti u budućnosti.');
    }
    if (
      vrsta === VrstaSastanka.SKUPSTINA &&
      !hitno &&
      danaDo(pocetak) < DANA_ZA_POZIV
    ) {
      throw greskaPolja(
        'pocetak',
        `Skupština se zakazuje bar ${DANA_ZA_POZIV} dana unapred, osim hitne sednice.`,
      );
    }
  }

  private async proveriTacke(
    vrsta: VrstaSastanka,
    tacke: Pick<TackaDto, 'odlukaId'>[],
    zgradaId: number,
  ) {
    const odluke = tacke
      .map((t) => t.odlukaId)
      .filter((odlukaId) => odlukaId !== undefined);
    if (odluke.length === 0) {
      return;
    }
    if (vrsta !== VrstaSastanka.SKUPSTINA) {
      throw greskaPolja('tacke', 'Odluka se vezuje samo uz skupštinu.');
    }
    if (new Set(odluke).size !== odluke.length) {
      throw greskaPolja('tacke', 'Ista odluka je uz više tačaka.');
    }
    const postoje = await this.glasanjeRepository.countBy({
      id: In(odluke),
      vrsta: VrstaGlasanja.ODLUKA,
      zgrada: { id: zgradaId },
    });
    if (postoje !== odluke.length) {
      throw greskaPolja('tacke', 'Izabrana odluka ne postoji u ovoj zgradi.');
    }
  }

  private hitno(vrsta: VrstaSastanka, hitno: boolean) {
    return vrsta === VrstaSastanka.SKUPSTINA && hitno;
  }

  private noveTacke(tacke: TackaDto[]) {
    return tacke.map((t, i) => ({
      redniBroj: i + 1,
      naslov: t.naslov,
      opis: t.opis || null,
      odluka: t.odlukaId === undefined ? null : { id: t.odlukaId },
    }));
  }

  private saPravima(sastanak: Sastanak, p: PristupZgradama) {
    const otkazan = sastanak.datumOtkazivanja !== null;
    const menja =
      sadrzi(p.upravlja, sastanak.zgrada.id) &&
      !otkazan &&
      sastanak.pocetak > new Date();
    return Object.assign(sastanak, {
      tacke: sastanak.tacke.toSorted((a, b) => a.redniBroj - b.redniBroj),
      otkazan,
      smeDaMenja: menja,
      smeDaOtkaze: menja,
    });
  }

  private async saOdlukama(
    sastanak: Sastanak,
    korisnikId: number,
    p: PristupZgradama,
  ) {
    const ids = sastanak.tacke.flatMap((t) => (t.odluka ? [t.odluka.id] : []));
    const odluke = await this.glasanjeRezultati.odluke(ids, korisnikId, p);
    const odlukaPoId = new Map(odluke.map((o) => [o.id, o]));
    const rezultat = this.saPravima(sastanak, p);
    return Object.assign(rezultat, {
      tacke: rezultat.tacke.map((t) =>
        Object.assign(t, {
          odluka: t.odluka ? (odlukaPoId.get(t.odluka.id) ?? null) : null,
        }),
      ),
    });
  }
}
