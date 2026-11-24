import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RefreshTokenModule } from '../auth/refresh-token/refresh-token.module.js';
import { StanarStanaModule } from '../stanar-stana/stanar-stana.module.js';
import { ZgradaModule } from '../zgrada/zgrada.module.js';
import { KvarModule } from '../kvar/kvar.module.js';
import { OglasModule } from '../oglas/oglas.module.js';
import { NalogKorisnikaController } from './nalog-korisnika.controller.js';
import { NalogKorisnikaService } from './nalog-korisnika.service.js';
import { NotifikacijaModule } from '../notifikacija/notifikacija.module.js';
import { MailModule } from '../shared/mail/mail.module.js';
import { MojNalogController } from './moj-nalog.controller.js';

@Module({
  imports: [
    AuthModule,
    RefreshTokenModule,
    StanarStanaModule,
    ZgradaModule,
    KvarModule,
    OglasModule,
    NotifikacijaModule,
    MailModule,
  ],
  controllers: [NalogKorisnikaController, MojNalogController],
  providers: [NalogKorisnikaService],
})
export class NalogKorisnikaModule {}
