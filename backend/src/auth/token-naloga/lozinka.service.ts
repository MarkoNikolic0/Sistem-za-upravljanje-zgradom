import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { Korisnik } from '../../korisnik/korisnik.entity.js';
import { AKTIVAN_KORISNIK } from '../../korisnik/aktivan-korisnik.js';
import { MailService } from '../../shared/mail/mail.service.js';
import { greskaPolja } from '../../shared/greske-validacije.js';
import { RefreshTokenService } from '../refresh-token/refresh-token.service.js';
import { NeuspelePrijaveService } from '../neuspele-prijave/neuspele-prijave.service.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import { NovaLozinkaDto } from '../dto/nova-lozinka.dto.js';
import { PORUKA_LINK } from '../auth.constants.js';
import { SvrhaTokena } from './token-naloga.entity.js';
import { TokenNalogaService } from './token-naloga.service.js';
import { mailLozinkaPromenjena, mailNovaLozinka } from './mailovi-naloga.js';
import { NotifikacijaService } from '../../notifikacija/notifikacija.service.js';
import { PushService } from '../../notifikacija/push/push.service.js';

@Injectable()
export class LozinkaService {
  private readonly logger = new Logger(LozinkaService.name);

  constructor(
    @InjectRepository(Korisnik)
    private korisnikRepository: Repository<Korisnik>,
    private dataSource: DataSource,
    private tokenNaloga: TokenNalogaService,
    private refreshTokenService: RefreshTokenService,
    private neuspelePrijaveService: NeuspelePrijaveService,
    private mailService: MailService,
    private notifikacije: NotifikacijaService,
    private pushService: PushService,
  ) {}

  async posaljiLink(email: string): Promise<void> {
    try {
      const token = await this.dataSource.transaction(async (manager) => {
        const korisnik = await manager.findOne(Korisnik, {
          where: { email, ...AKTIVAN_KORISNIK },
          select: { id: true },
          lock: { mode: 'for_no_key_update' },
        });
        return korisnik
          ? this.tokenNaloga.napravi(manager, korisnik.id, SvrhaTokena.LOZINKA)
          : null;
      });
      if (token) {
        const link = this.tokenNaloga.link(SvrhaTokena.LOZINKA, token);
        await this.tokenNaloga.posalji(mailNovaLozinka(email, link), token);
      }
    } catch (greska) {
      this.logger.error('Link za novu lozinku nije napravljen.', greska);
    }
  }

  async postaviNovu(dto: NovaLozinkaDto): Promise<void> {
    const { id, email } = await this.dataSource.transaction(async (manager) => {
      const korisnikId = await this.tokenNaloga.iskoristi(
        manager,
        dto.token,
        SvrhaTokena.LOZINKA,
      );
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
      await this.tokenNaloga.obrisi(manager, korisnik.id);
      await this.neuspelePrijaveService.obrisiSve(manager, korisnik.email);
      await this.refreshTokenService.opozoviSveSesije(manager, korisnik.id);
      await this.pushService.obrisiSve(manager, korisnik.id);
      return korisnik;
    });
    this.notifikacije.prekiniVeze(id);

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
      await this.tokenNaloga.obrisi(manager, korisnikId, SvrhaTokena.LOZINKA);
      await this.refreshTokenService.opozoviOstaleSesije(
        manager,
        korisnikId,
        refreshToken,
      );
      await this.pushService.obrisiSve(manager, korisnikId);
    });
    this.notifikacije.prekiniVeze(korisnikId);

    void this.mailService.posalji(mailLozinkaPromenjena(korisnik.email));
  }
}
