import { nePostoji } from '../../shared/ne-postoji.js';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
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
import type { TrenutniKorisnikPodaci } from '../decorators/trenutni-korisnik.decorator.js';

@Injectable()
export class LozinkaService {
  private readonly logger = new Logger(LozinkaService.name);

  constructor(
    private dataSource: DataSource,
    private tokenNaloga: TokenNalogaService,
    private refreshTokenService: RefreshTokenService,
    private neuspelePrijaveService: NeuspelePrijaveService,
    private mailService: MailService,
    private notifikacije: NotifikacijaService,
    private pushService: PushService,
  ) {}

  posaljiLink(email: string): Promise<void> {
    return this.tokenNaloga.posaljiLink(
      email,
      SvrhaTokena.LOZINKA,
      AKTIVAN_KORISNIK,
      mailNovaLozinka,
    );
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
    this.logger.log(
      `Nalog ${id} je postavio novu lozinku preko linka iz mejla.`,
    );

    void this.mailService.posalji(mailLozinkaPromenjena(email));
  }

  async promeni(
    { id, sid }: TrenutniKorisnikPodaci,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const email = await this.dataSource.transaction(async (manager) => {
      const korisnik = await manager.findOne(Korisnik, {
        where: { id },
        select: { id: true, email: true, lozinka: true },
        lock: { mode: 'for_no_key_update' },
      });
      if (!korisnik) {
        throw nePostoji('Korisnik', id);
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
      await manager.update(Korisnik, id, { lozinka: hes });
      await this.tokenNaloga.obrisi(manager, id, SvrhaTokena.LOZINKA);
      await this.refreshTokenService.opozoviOstaleSesije(manager, id, sid);
      await this.pushService.obrisiSve(manager, id);
      return korisnik.email;
    });
    this.notifikacije.prekiniVeze(id);
    this.logger.log(`Nalog ${id} je promenio lozinku.`);

    void this.mailService.posalji(mailLozinkaPromenjena(email));
  }
}
