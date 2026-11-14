import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcrypt';
import { parsePhoneNumberWithError } from 'libphonenumber-js/min';
import { DataSource, IsNull } from 'typeorm';
import { Korisnik } from '../../korisnik/korisnik.entity.js';
import { RegisterDto } from '../dto/register.dto.js';
import {
  BRISANJE_NEPOTVRDJENIH_DANA,
  PORUKA_POTVRDA,
} from '../auth.constants.js';
import { SvrhaTokena } from './token-naloga.entity.js';
import { TokenNalogaService } from './token-naloga.service.js';
import { mailNalogPostoji, mailPotvrda } from './mailovi-naloga.js';

@Injectable()
export class PotvrdaEmailaService {
  private readonly logger = new Logger(PotvrdaEmailaService.name);

  constructor(
    private dataSource: DataSource,
    private tokenNaloga: TokenNalogaService,
  ) {}

  async registruj(dto: RegisterDto): Promise<void> {
    try {
      const lozinka = await bcrypt.hash(dto.lozinka, 10);
      const podaci = {
        ime: dto.ime,
        prezime: dto.prezime,
        telefon: parsePhoneNumberWithError(dto.telefon, 'RS').number,
        lozinka,
      };

      const poslati = await this.dataSource.transaction(async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          dto.email,
        ]);
        const postojeci = await manager.findOne(Korisnik, {
          where: { email: dto.email },
          select: { id: true, deaktiviran: true, emailPotvrdjen: true },
          lock: { mode: 'for_no_key_update' },
        });
        if (postojeci?.deaktiviran) {
          return null;
        }
        if (postojeci?.emailPotvrdjen) {
          const token = await this.tokenNaloga.napravi(
            manager,
            postojeci.id,
            SvrhaTokena.LOZINKA,
          );
          return token && { svrha: SvrhaTokena.LOZINKA, token };
        }

        let id = postojeci?.id;
        if (!id) {
          const { identifiers } = await manager.insert(Korisnik, {
            ...podaci,
            email: dto.email,
          });
          id = (identifiers[0] as { id: number }).id;
        }
        const token = await this.tokenNaloga.napravi(
          manager,
          id,
          SvrhaTokena.POTVRDA,
        );
        if (token && postojeci) {
          await manager.update(Korisnik, id, {
            ...podaci,
            kreiranDatum: new Date(),
          });
        }
        return token && { svrha: SvrhaTokena.POTVRDA, token };
      });

      if (poslati) {
        const link = this.tokenNaloga.link(poslati.svrha, poslati.token);
        const mail =
          poslati.svrha === SvrhaTokena.POTVRDA
            ? mailPotvrda(dto.email, link)
            : mailNalogPostoji(dto.email, link);
        await this.tokenNaloga.posalji(mail, poslati.token);
      }
    } catch (greska) {
      this.logger.error('Registracija nije obrađena.', greska);
    }
  }

  async posaljiPonovo(email: string): Promise<void> {
    try {
      const token = await this.dataSource.transaction(async (manager) => {
        const korisnik = await manager.findOne(Korisnik, {
          where: { email, deaktiviran: IsNull(), emailPotvrdjen: IsNull() },
          select: { id: true },
          lock: { mode: 'for_no_key_update' },
        });
        return korisnik
          ? this.tokenNaloga.napravi(manager, korisnik.id, SvrhaTokena.POTVRDA)
          : null;
      });
      if (token) {
        const link = this.tokenNaloga.link(SvrhaTokena.POTVRDA, token);
        await this.tokenNaloga.posalji(mailPotvrda(email, link), token);
      }
    } catch (greska) {
      this.logger.error('Link za aktivaciju nije napravljen.', greska);
    }
  }

  async potvrdi(token: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const korisnikId = await this.tokenNaloga.iskoristi(
        manager,
        token,
        SvrhaTokena.POTVRDA,
      );
      const korisnik = korisnikId
        ? await manager.findOne(Korisnik, {
            where: { id: korisnikId, deaktiviran: IsNull() },
            select: { id: true, emailPotvrdjen: true },
          })
        : null;
      if (!korisnik) {
        throw new BadRequestException(PORUKA_POTVRDA);
      }
      await manager.update(Korisnik, korisnik.id, {
        emailPotvrdjen: korisnik.emailPotvrdjen ?? new Date(),
      });
      await this.tokenNaloga.obrisi(manager, korisnik.id, SvrhaTokena.POTVRDA);
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async obrisiNepotvrdjene() {
    await this.dataSource.query(
      `DELETE FROM "korisnik" k
       WHERE k."emailPotvrdjen" IS NULL
         AND k."kreiranDatum" < now() - interval '${BRISANJE_NEPOTVRDJENIH_DANA} days'
         AND NOT EXISTS (
           SELECT 1 FROM "token_naloga" t
           WHERE t."korisnikId" = k.id AND t."datumIsteka" > now()
         )`,
    );
  }
}
