import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import {
  DataSource,
  EntityManager,
  LessThan,
  MoreThan,
  Repository,
} from 'typeorm';
import { Korisnik } from '../../korisnik/korisnik.entity.js';
import { AKTIVAN_KORISNIK } from '../../korisnik/aktivan-korisnik.js';
import { MailService } from '../../shared/mail/mail.service.js';
import { greskaPolja } from '../../shared/greske-validacije.js';
import { RefreshTokenService } from '../refresh-token/refresh-token.service.js';
import { NeuspelePrijaveService } from '../neuspele-prijave/neuspele-prijave.service.js';
import { generisiToken, hesirajToken } from '../token.util.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import { NovaLozinkaDto } from '../dto/nova-lozinka.dto.js';
import {
  PORUKA_LINK,
  RAZMAK_MAILOVA_S,
  TRAJANJE_LINKA_MIN,
} from '../auth.constants.js';
import { TokenLozinke } from './token-lozinke.entity.js';
import { mailLozinkaPromenjena, mailNovaLozinka } from './mailovi-lozinke.js';

@Injectable()
export class LozinkaService {
  private readonly logger = new Logger(LozinkaService.name);

  constructor(
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
    @InjectRepository(TokenLozinke)
    private tokenRepository: Repository<TokenLozinke>,
    private dataSource: DataSource,
    private refreshTokenService: RefreshTokenService,
    private neuspelePrijaveService: NeuspelePrijaveService,
    private mailService: MailService,
    private config: ConfigService,
  ) {}

  async posaljiLink(email: string): Promise<void> {
    try {
      const token = await this.napraviToken(email);
      if (!token) {
        return;
      }
      const link = new URL(
        '/nova-lozinka',
        this.config.get<string>('FRONTEND_URL'),
      );
      link.searchParams.set('token', token);
      const poslat = await this.mailService.posalji(
        mailNovaLozinka(email, link.href),
      );
      if (!poslat) {
        await this.tokenRepository.delete({ tokenHash: hesirajToken(token) });
      }
    } catch (greska) {
      this.logger.error('Link za novu lozinku nije napravljen.', greska);
    }
  }

  async postaviNovu(dto: NovaLozinkaDto): Promise<void> {
    const email = await this.dataSource.transaction(async (manager) => {
      const { raw } = await manager
        .createQueryBuilder()
        .delete()
        .from(TokenLozinke)
        .where('"tokenHash" = :tokenHash AND "datumIsteka" > now()', {
          tokenHash: hesirajToken(dto.token),
        })
        .returning('"korisnikId"')
        .execute();
      const korisnikId = (raw as { korisnikId: number }[])[0]?.korisnikId;

      const korisnik = korisnikId
        ? await manager.findOne(Korisnik, {
            where: { id: korisnikId, ...AKTIVAN_KORISNIK },
            lock: { mode: 'for_no_key_update' },
          })
        : null;
      if (!korisnik) {
        throw new BadRequestException(PORUKA_LINK);
      }

      const hes = await bcrypt.hash(dto.lozinka, 10);
      await manager.update(Korisnik, korisnik.id, { lozinka: hes });
      await this.obrisiLinkove(manager, korisnik.id);
      await this.neuspelePrijaveService.obrisiSve(manager, korisnik.id);
      await this.refreshTokenService.opozoviSveSesije(manager, korisnik.id);
      return korisnik.email;
    });

    void this.mailService.posalji(mailLozinkaPromenjena(email));
  }

  async promeni(
    korisnikId: number,
    dto: ChangePasswordDto,
    refreshToken: string | undefined,
  ): Promise<void> {
    const korisnik = await this.korisnikRepository.findOne({
      where: { id: korisnikId },
    });
    if (!korisnik) {
      throw new NotFoundException('Korisnik ne postoji.');
    }

    const trenutnaIspravna = await bcrypt.compare(
      dto.trenutnaLozinka,
      korisnik.lozinka,
    );
    if (!trenutnaIspravna) {
      throw greskaPolja('trenutnaLozinka', 'Trenutna lozinka nije ispravna.');
    }

    const istaKaoStara = await bcrypt.compare(
      dto.novaLozinka,
      korisnik.lozinka,
    );
    if (istaKaoStara) {
      throw greskaPolja(
        'novaLozinka',
        'Nova lozinka mora biti drugačija od trenutne.',
      );
    }

    const hes = await bcrypt.hash(dto.novaLozinka, 10);
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Korisnik, korisnikId, { lozinka: hes });
      await this.obrisiLinkove(manager, korisnikId);
      await this.refreshTokenService.opozoviOstaleSesije(
        manager,
        korisnikId,
        refreshToken,
      );
    });

    void this.mailService.posalji(mailLozinkaPromenjena(korisnik.email));
  }

  async obrisiLinkove(manager: EntityManager, korisnikId: number) {
    await manager.delete(TokenLozinke, { korisnik: { id: korisnikId } });
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async obrisiIstekle() {
    await this.tokenRepository.delete({ datumIsteka: LessThan(new Date()) });
  }

  private napraviToken(email: string): Promise<string | null> {
    return this.dataSource.transaction(async (manager) => {
      const korisnik = await manager.findOne(Korisnik, {
        where: { email, ...AKTIVAN_KORISNIK },
        select: { id: true },
        lock: { mode: 'for_no_key_update' },
      });
      if (!korisnik) {
        return null;
      }

      const sada = Date.now();
      const nedavno = await manager.existsBy(TokenLozinke, {
        korisnik: { id: korisnik.id },
        datumKreiranja: MoreThan(new Date(sada - RAZMAK_MAILOVA_S * 1000)),
      });
      if (nedavno) {
        return null;
      }

      const token = generisiToken();
      await this.obrisiLinkove(manager, korisnik.id);
      await manager.insert(TokenLozinke, {
        tokenHash: hesirajToken(token),
        korisnik: { id: korisnik.id },
        datumIsteka: new Date(sada + TRAJANJE_LINKA_MIN * 60 * 1000),
      });
      return token;
    });
  }
}
