import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  type FindOptionsWhere,
  LessThan,
  MoreThan,
  Repository,
} from 'typeorm';
import { Korisnik } from '../../korisnik/korisnik.entity.js';
import { MailService, type Mail } from '../../shared/mail/mail.service.js';
import { generisiToken, hesirajToken } from '../token.util.js';
import {
  RAZMAK_MAILOVA_S,
  TRAJANJE_LINKA_MIN,
  TRAJANJE_POTVRDE_SATI,
} from '../auth.constants.js';
import { SvrhaTokena, TokenNaloga } from './token-naloga.entity.js';
import { stekGreske } from '../../shared/stek-greske.js';

const TRAJANJE_MS: Record<SvrhaTokena, number> = {
  [SvrhaTokena.LOZINKA]: TRAJANJE_LINKA_MIN * 60 * 1000,
  [SvrhaTokena.POTVRDA]: TRAJANJE_POTVRDE_SATI * 60 * 60 * 1000,
};

const PUTANJA: Record<SvrhaTokena, string> = {
  [SvrhaTokena.LOZINKA]: '/nova-lozinka',
  [SvrhaTokena.POTVRDA]: '/potvrda-emaila',
};

@Injectable()
export class TokenNalogaService {
  private readonly logger = new Logger(TokenNalogaService.name);

  constructor(
    @InjectRepository(TokenNaloga)
    private tokenRepository: Repository<TokenNaloga>,
    private dataSource: DataSource,
    private mailService: MailService,
    private config: ConfigService,
  ) {}

  async posaljiLink(
    email: string,
    svrha: SvrhaTokena,
    uslov: FindOptionsWhere<Korisnik>,
    napraviMail: (za: string, link: string) => Mail,
  ): Promise<void> {
    try {
      const token = await this.dataSource.transaction(async (manager) => {
        const korisnik = await manager.findOne(Korisnik, {
          where: { email, ...uslov },
          select: { id: true },
          lock: { mode: 'for_no_key_update' },
        });
        return korisnik ? this.napravi(manager, korisnik.id, svrha) : null;
      });
      if (token) {
        await this.posalji(napraviMail(email, this.link(svrha, token)), token);
      }
    } catch (greska) {
      this.logger.error(`Link (${svrha}) nije poslat.`, stekGreske(greska));
    }
  }

  async napravi(
    manager: EntityManager,
    korisnikId: number,
    svrha: SvrhaTokena,
  ): Promise<string | null> {
    const sada = Date.now();
    const nedavno = await manager.existsBy(TokenNaloga, {
      korisnik: { id: korisnikId },
      svrha,
      datumKreiranja: MoreThan(new Date(sada - RAZMAK_MAILOVA_S * 1000)),
    });
    if (nedavno) {
      return null;
    }

    const token = generisiToken();
    await manager.insert(TokenNaloga, {
      tokenHash: hesirajToken(token),
      svrha,
      korisnik: { id: korisnikId },
      datumIsteka: new Date(sada + TRAJANJE_MS[svrha]),
    });
    return token;
  }

  async iskoristi(
    manager: EntityManager,
    token: string,
    svrha: SvrhaTokena,
  ): Promise<number | undefined> {
    const nadjen = await manager.findOne(TokenNaloga, {
      where: {
        tokenHash: hesirajToken(token),
        svrha,
        datumIsteka: MoreThan(new Date()),
      },
      relations: { korisnik: true },
      select: { id: true, korisnik: { id: true } },
    });
    if (!nadjen) {
      return undefined;
    }
    await manager.findOne(Korisnik, {
      where: { id: nadjen.korisnik.id },
      select: { id: true },
      lock: { mode: 'for_no_key_update' },
    });
    const { affected } = await manager.delete(TokenNaloga, { id: nadjen.id });
    return affected ? nadjen.korisnik.id : undefined;
  }

  async obrisi(
    manager: EntityManager,
    korisnikId: number,
    svrha?: SvrhaTokena,
  ) {
    await manager.delete(TokenNaloga, {
      korisnik: { id: korisnikId },
      ...(svrha && { svrha }),
    });
  }

  link(svrha: SvrhaTokena, token: string, zgradaId?: number): string {
    const link = new URL(
      PUTANJA[svrha],
      this.config.get<string>('FRONTEND_URL'),
    );
    link.searchParams.set('token', token);
    if (zgradaId) {
      link.searchParams.set('zgrada', String(zgradaId));
    }
    return link.href;
  }

  async posalji(mail: Mail, token: string): Promise<void> {
    const tokenHash = hesirajToken(token);
    if (!(await this.mailService.posalji(mail))) {
      await this.tokenRepository.delete({ tokenHash });
      return;
    }
    await this.tokenRepository.query(
      `DELETE FROM "token_naloga" stari
       USING "token_naloga" novi
       WHERE novi."tokenHash" = $1
         AND stari."korisnikId" = novi."korisnikId"
         AND stari."svrha" = novi."svrha"
         AND stari.id <> novi.id`,
      [tokenHash],
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async obrisiIstekle() {
    await this.tokenRepository.delete({ datumIsteka: LessThan(new Date()) });
  }
}
