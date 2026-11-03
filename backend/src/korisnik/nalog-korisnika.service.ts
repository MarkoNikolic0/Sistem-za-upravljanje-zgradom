import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull, Raw } from 'typeorm';
import { Korisnik } from './korisnik.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { ZahtevPovezivanje } from '../zahtev-povezivanje/zahtev-povezivanje.entity.js';
import { Glas } from '../glasanje/glas.entity.js';
import { PratilacKvara } from '../pratilac-kvara/pratilac-kvara.entity.js';
import { Kvar } from '../kvar/kvar.entity.js';
import { PromenaStatusaKvara } from '../kvar/promena-statusa-kvara.entity.js';
import { ServiserSpecijalnost } from '../serviser-specijalnost/serviser-specijalnost.entity.js';
import { RefreshToken } from '../auth/refresh-token/refresh-token.entity.js';
import { StatusZahteva } from '../shared/enums/status-zahteva.enum.js';
import { StatusKvara } from '../shared/enums/kvar.enums.js';
import { Uloga } from '../shared/enums/uloga.enum.js';
import { PromeniUloguDto } from './dto/promeni-ulogu.dto.js';

// Kvarovi na kojima serviser jos radi vracaju se upravniku na ponovnu dodelu
const KVAROVI_U_RADU = [StatusKvara.DODELJEN, StatusKvara.U_TOKU];

@Injectable()
export class NalogKorisnikaService {
  constructor(private dataSource: DataSource) {}

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
        // Serviser ne salje zahteve za stan; odbijanje ceka zahtev koji se upravo prihvata
        await this.odbijZahteve(manager, id);
        if (
          await manager.exists(StanarStana, { where: { korisnik: { id } } })
        ) {
          throw new ConflictException(
            `${korisnik.ime} ${korisnik.prezime} ima stan. Serviser ne može da stanuje u zgradi. Prvo odseli ovog stanara.`,
          );
        }
      } else {
        await this.vratiKvarove(manager, id, adminId);
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
      // Prvo veze sa stanom: glasanje i pracenje ih zakljucavaju, pa posle njih ne ostaje nov glas
      await manager.delete(StanarStana, { korisnik: { id } });
      await manager.delete(Glas, {
        korisnik: { id },
        glasanje: {
          id: Raw(
            (kolona) =>
              `${kolona} IN (SELECT "id" FROM "glasanje" WHERE "rok" > now())`,
          ),
        },
      });
      await manager.delete(PratilacKvara, { korisnik: { id } });
      await this.vratiKvarove(manager, id, adminId);
      await manager.update(
        RefreshToken,
        { korisnik: { id }, datumOpoziva: IsNull() },
        { datumOpoziva: new Date() },
      );
      await manager.update(Korisnik, id, {
        deaktiviran: new Date(),
        ...(korisnik.uloga === Uloga.UPRAVNIK && {
          uloga: Uloga.STANAR,
          zgrada: null,
        }),
      });
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

  private async vratiKvarove(
    manager: EntityManager,
    serviserId: number,
    adminId: number,
  ) {
    const rezultat = await manager
      .createQueryBuilder()
      .update(Kvar)
      .set({
        status: StatusKvara.PRIHVACEN,
        serviser: null,
        dolazakServisera: null,
      })
      .where({ serviser: { id: serviserId }, status: In(KVAROVI_U_RADU) })
      .returning('id')
      .execute();
    const kvarovi = rezultat.raw as { id: number }[];
    if (kvarovi.length > 0) {
      await manager.insert(
        PromenaStatusaKvara,
        kvarovi.map(({ id }) => ({
          kvar: { id },
          status: StatusKvara.PRIHVACEN,
          korisnik: { id: adminId },
        })),
      );
    }
  }
}
