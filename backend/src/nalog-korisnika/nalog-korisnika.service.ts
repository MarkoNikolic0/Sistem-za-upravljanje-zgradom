import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import {
  AKTIVAN_KORISNIK,
  POTVRDJEN_EMAIL,
} from '../korisnik/aktivan-korisnik.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { ZahtevPovezivanje } from '../zahtev-povezivanje/zahtev-povezivanje.entity.js';
import { ServiserSpecijalnost } from '../serviser-specijalnost/serviser-specijalnost.entity.js';
import { StatusZahteva } from '../shared/enums/status-zahteva.enum.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { StanarStanaService } from '../stanar-stana/stanar-stana.service.js';
import { UpravnikZgradeService } from '../zgrada/upravnik-zgrade.service.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { KvarAkcijeService } from '../kvar/kvar-akcije.service.js';
import { OglasService } from '../oglas/oglas.service.js';
import { RefreshTokenService } from '../auth/refresh-token/refresh-token.service.js';
import { TokenNalogaService } from '../auth/token-naloga/token-naloga.service.js';
import { PromeniUloguDto } from './dto/promeni-ulogu.dto.js';
import { NotifikacijaService } from '../notifikacija/notifikacija.service.js';
import { PushService } from '../notifikacija/push/push.service.js';
import { odbijZahteve } from '../zahtev-povezivanje/odbij-zahteve.js';
import { nePostoji } from '../shared/ne-postoji.js';
import { greskaPolja } from '../shared/greske-validacije.js';
import { MailService } from '../shared/mail/mail.service.js';
import { generisiToken } from '../auth/token.util.js';
import { mailNalogObrisan } from '../auth/token-naloga/mailovi-naloga.js';
import { Notifikacija } from '../notifikacija/notifikacija.entity.js';
import { PratilacKvara } from '../pratilac-kvara/pratilac-kvara.entity.js';
import type { TrenutniKorisnikPodaci } from '../auth/decorators/trenutni-korisnik.decorator.js';
import type { PrilogOglasa } from '../oglas/prilog-oglasa.entity.js';
import { BrisanjeNalogaDto } from './dto/brisanje-naloga.dto.js';

export const IME_OBRISANOG = 'Bivši';
export const PREZIME_OBRISANOG = 'korisnik';

@Injectable()
export class NalogKorisnikaService {
  private readonly logger = new Logger(NalogKorisnikaService.name);

  constructor(
    private dataSource: DataSource,
    private stanariService: StanarStanaService,
    private upravnikService: UpravnikZgradeService,
    private kvarAkcijeService: KvarAkcijeService,
    private oglasService: OglasService,
    private refreshTokenService: RefreshTokenService,
    private tokenNaloga: TokenNalogaService,
    private notifikacije: NotifikacijaService,
    private pushService: PushService,
    private mailService: MailService,
  ) {}

  async promeniUlogu(id: number, adminId: number, dto: PromeniUloguDto) {
    await this.dataSource.transaction(async (manager) => {
      const korisnik = await this.zakljucaj(manager, id, adminId);
      if (korisnik.deaktiviran) {
        throw new ConflictException('Nalog je deaktiviran. Prvo ga aktiviraj.');
      }
      if (korisnik.uloga === dto.uloga) {
        return;
      }
      if (korisnik.uloga === Uloga.UPRAVNIK) {
        const zgrade = await manager.find(Zgrada, {
          where: { upravnikId: id },
          select: { id: true, naziv: true },
          order: { naziv: 'ASC' },
        });
        if (zgrade.length > 0) {
          const nazivi = zgrade.map((z) => `„${z.naziv}“`).join(', ');
          throw new ConflictException(
            `${korisnik.ime} ${korisnik.prezime} upravlja ${zgrade.length === 1 ? 'zgradom' : 'zgradama'} ${nazivi}. Upravnik se razrešava na stranici zgrade.`,
          );
        }
      }

      if (dto.uloga === Uloga.SERVISER) {
        await odbijZahteve(
          manager,
          this.notifikacije,
          { korisnik: { id } },
          'Nalog je postao serviserski.',
        );
        if (
          await manager.exists(StanarStana, { where: { korisnik: { id } } })
        ) {
          throw new ConflictException(
            `${korisnik.ime} ${korisnik.prezime} ima stan. Serviser ne može da stanuje u zgradi. Prvo odseli ovog stanara.`,
          );
        }
      } else {
        await this.kvarAkcijeService.vratiKvaroveServisera(
          manager,
          id,
          adminId,
        );
        await manager.delete(ServiserSpecijalnost, { korisnik: { id } });
      }
      await manager.update(Korisnik, id, { uloga: dto.uloga });
      this.logger.log(
        `Admin ${adminId} je nalogu ${id} promenio ulogu iz ${korisnik.uloga} u ${dto.uloga}.`,
      );
    });
  }

  async deaktiviraj(id: number, adminId: number) {
    await this.dataSource.transaction(async (manager) => {
      await this.upravnikService.zakljucajZgradeUpravnika(manager, id);
      const korisnik = await this.zakljucaj(manager, id, adminId);
      if (korisnik.deaktiviran) {
        return;
      }
      await this.oglasService.sakrijOglase(
        manager,
        { autor: { id } },
        'Nalog autora je deaktiviran.',
      );
      await this.ukloniPristup(manager, id, adminId, 'Nalog je deaktiviran.');
      await manager.update(Korisnik, id, { deaktiviran: new Date() });
      this.logger.log(`Admin ${adminId} je deaktivirao nalog ${id}.`);
    });
    this.notifikacije.prekiniVeze(id);
  }

  async aktiviraj(id: number, adminId: number) {
    await this.dataSource.transaction(async (manager) => {
      const korisnik = await this.zakljucaj(manager, id, adminId);
      await manager.update(Korisnik, id, { deaktiviran: null });
      if (korisnik.deaktiviran) {
        this.logger.log(`Admin ${adminId} je aktivirao nalog ${id}.`);
      }
    });
  }

  async obrisiSvoj(
    { id, uloga, sid }: TrenutniKorisnikPodaci,
    dto: BrisanjeNalogaDto,
  ) {
    if (uloga === Uloga.ADMIN) {
      throw new ForbiddenException(
        'Nalog administratora ne može da se obriše.',
      );
    }
    const { email, prilozi } = await this.dataSource.transaction(
      async (manager) => {
        await this.upravnikService.zakljucajZgradeUpravnika(manager, id);
        const korisnik = await manager.findOne(Korisnik, {
          where: { id, ...AKTIVAN_KORISNIK },
          select: { id: true, email: true, lozinka: true, deaktiviran: true },
          lock: { mode: 'for_no_key_update', tables: ['korisnik'] },
        });
        if (!korisnik) {
          throw nePostoji('Korisnik', id);
        }
        if (!(await bcrypt.compare(dto.lozinka, korisnik.lozinka))) {
          throw greskaPolja('lozinka', 'Lozinka nije ispravna.');
        }
        return this.anonimizuj(manager, korisnik, id);
      },
    );
    this.notifikacije.prekiniOstaleSesije(id, sid);
    this.posleBrisanja(email, prilozi);
    this.logger.log(`Nalog ${id} je obrisao svoj nalog.`);
  }

  async obrisi(id: number, adminId: number) {
    const { email, prilozi } = await this.dataSource.transaction(
      async (manager) => {
        await this.upravnikService.zakljucajZgradeUpravnika(manager, id);
        const korisnik = await this.zakljucaj(manager, id, adminId);
        if (!korisnik.deaktiviran) {
          throw new ConflictException(
            'Briše se samo deaktiviran nalog. Prvo ga deaktiviraj.',
          );
        }
        return this.anonimizuj(manager, korisnik, adminId);
      },
    );
    this.notifikacije.prekiniVeze(id);
    this.posleBrisanja(email, prilozi);
    this.logger.log(`Admin ${adminId} je obrisao nalog ${id}.`);
  }

  private async anonimizuj(
    manager: EntityManager,
    korisnik: Pick<Korisnik, 'id' | 'email' | 'deaktiviran'>,
    izvrsilacId: number,
  ): Promise<{ email: string; prilozi: PrilogOglasa[] }> {
    const { id } = korisnik;
    const prilozi = await this.oglasService.obrisiLicneOglase(manager, id);
    await this.ukloniPristup(manager, id, izvrsilacId, 'Nalog je obrisan.');
    await manager.delete(Notifikacija, { korisnik: { id } });
    await manager.delete(PratilacKvara, { korisnik: { id } });
    await manager.delete(ServiserSpecijalnost, { korisnik: { id } });
    const sada = new Date();
    await manager.update(Korisnik, id, {
      ime: IME_OBRISANOG,
      prezime: PREZIME_OBRISANOG,
      email: `obrisan-${id}@obrisan.invalid`,
      telefon: '',
      lozinka: await bcrypt.hash(generisiToken(), 10),
      deaktiviran: korisnik.deaktiviran ?? sada,
      obrisan: sada,
    });
    return { email: korisnik.email, prilozi };
  }

  private posleBrisanja(email: string, prilozi: PrilogOglasa[]) {
    void this.oglasService.obrisiFajlovePriloga(prilozi);
    void this.mailService.posalji(mailNalogObrisan(email));
  }

  private async ukloniPristup(
    manager: EntityManager,
    id: number,
    izvrsilacId: number,
    razlog: string,
  ) {
    await manager.update(
      ZahtevPovezivanje,
      { korisnik: { id }, status: StatusZahteva.NA_CEKANJU },
      { status: StatusZahteva.ODBIJEN, razlogOdbijanja: razlog },
    );
    await this.stanariService.odseliIzSvihStanova(manager, id);
    await this.upravnikService.razresiSvuda(manager, id);
    await this.kvarAkcijeService.vratiKvaroveServisera(
      manager,
      id,
      izvrsilacId,
    );
    await this.refreshTokenService.opozoviSveSesije(manager, id);
    await this.pushService.obrisiSve(manager, id);
    await this.tokenNaloga.obrisi(manager, id);
  }

  private async zakljucaj(manager: EntityManager, id: number, adminId: number) {
    if (id === adminId) {
      throw new ForbiddenException('Svoj nalog ne možeš da menjaš ovde.');
    }
    const korisnik = await manager.findOne(Korisnik, {
      where: { id, obrisan: IsNull(), ...POTVRDJEN_EMAIL },
      lock: { mode: 'for_no_key_update', tables: ['korisnik'] },
    });
    if (!korisnik) {
      throw nePostoji('Korisnik', id);
    }
    if (korisnik.uloga === Uloga.ADMIN) {
      throw new ForbiddenException('Nalog administratora se ne menja ovde.');
    }
    return korisnik;
  }
}
