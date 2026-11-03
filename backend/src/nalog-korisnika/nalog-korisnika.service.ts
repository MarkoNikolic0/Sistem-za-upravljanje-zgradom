import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { ZahtevPovezivanje } from '../zahtev-povezivanje/zahtev-povezivanje.entity.js';
import { ServiserSpecijalnost } from '../serviser-specijalnost/serviser-specijalnost.entity.js';
import { StatusZahteva } from '../shared/enums/status-zahteva.enum.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { StanarStanaService } from '../stanar-stana/stanar-stana.service.js';
import { UpravnikZgradeService } from '../zgrada/upravnik-zgrade.service.js';
import { KvarAkcijeService } from '../kvar/kvar-akcije.service.js';
import { OglasService } from '../oglas/oglas.service.js';
import { RefreshTokenService } from '../auth/refresh-token/refresh-token.service.js';
import { PromeniUloguDto } from './dto/promeni-ulogu.dto.js';

@Injectable()
export class NalogKorisnikaService {
  constructor(
    private dataSource: DataSource,
    private stanariService: StanarStanaService,
    private upravnikService: UpravnikZgradeService,
    private kvarAkcijeService: KvarAkcijeService,
    private oglasService: OglasService,
    private refreshTokenService: RefreshTokenService,
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
        throw new ConflictException(
          `${korisnik.ime} ${korisnik.prezime} upravlja zgradom „${korisnik.zgrada?.naziv}“. Upravnik se razrešava na stranici zgrade.`,
        );
      }

      if (dto.uloga === Uloga.SERVISER) {
        await this.odbijZahteve(manager, id);
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
    });
  }

  async deaktiviraj(id: number, adminId: number) {
    await this.dataSource.transaction(async (manager) => {
      const korisnik = await this.zakljucaj(manager, id, adminId);
      if (korisnik.deaktiviran) {
        return;
      }
      await this.odbijZahteve(manager, id);
      await this.stanariService.odseliIzSvihStanova(manager, id);
      if (korisnik.zgrada) {
        await this.upravnikService.vratiUStanara(manager, korisnik.zgrada.id);
      }
      await this.kvarAkcijeService.vratiKvaroveServisera(manager, id, adminId);
      await this.oglasService.sakrijOglaseAutora(manager, id);
      await this.refreshTokenService.opozoviSveSesije(manager, id);
      await manager.update(Korisnik, id, { deaktiviran: new Date() });
    });
  }

  async aktiviraj(id: number, adminId: number) {
    await this.dataSource.transaction(async (manager) => {
      await this.zakljucaj(manager, id, adminId);
      await manager.update(Korisnik, id, { deaktiviran: null });
    });
  }

  private async zakljucaj(manager: EntityManager, id: number, adminId: number) {
    if (id === adminId) {
      throw new ForbiddenException('Svoj nalog ne možeš da menjaš ovde.');
    }
    const korisnik = await manager.findOne(Korisnik, {
      where: { id },
      relations: { zgrada: true },
      lock: { mode: 'for_no_key_update', tables: ['korisnik'] },
    });
    if (!korisnik) {
      throw new NotFoundException(`Korisnik sa id-jem ${id} ne postoji!`);
    }
    if (korisnik.uloga === Uloga.ADMIN) {
      throw new ForbiddenException('Nalog administratora se ne menja ovde.');
    }
    return korisnik;
  }

  private async odbijZahteve(manager: EntityManager, id: number) {
    await manager.update(
      ZahtevPovezivanje,
      { korisnik: { id }, status: StatusZahteva.NA_CEKANJU },
      { status: StatusZahteva.ODBIJEN },
    );
  }
}
