import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sastanak } from './sastanak.entity.js';
import { TackaDnevnogReda } from './tacka-dnevnog-reda.entity.js';
import { PotvrdaPrisustva } from './potvrda-prisustva.entity.js';
import { PrisutanStan } from './prisutan-stan.entity.js';
import { Glasanje } from '../glasanje/glasanje.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { DokumentZgrade } from '../dokument-zgrade/dokument-zgrade.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { KorisnikModule } from '../korisnik/korisnik.module.js';
import { GlasanjeModule } from '../glasanje/glasanje.module.js';
import { DokumentZgradeModule } from '../dokument-zgrade/dokument-zgrade.module.js';
import { SkladisteModule } from '../shared/skladiste/skladiste.module.js';
import { SastanakController } from './sastanak.controller.js';
import { SastanakService } from './sastanak.service.js';
import { SastanakPravaService } from './sastanak-prava.service.js';
import { PrisustvoSastankaController } from './prisustvo-sastanka.controller.js';
import { PrisustvoSastankaService } from './prisustvo-sastanka.service.js';
import { ZapisnikSastankaController } from './zapisnik-sastanka.controller.js';
import { ZapisnikSastankaService } from './zapisnik-sastanka.service.js';
import { NotifikacijaModule } from '../notifikacija/notifikacija.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sastanak,
      TackaDnevnogReda,
      PotvrdaPrisustva,
      PrisutanStan,
      Glasanje,
      Zgrada,
      Stan,
      DokumentZgrade,
    ]),
    AuthModule,
    KorisnikModule,
    NotifikacijaModule,
    GlasanjeModule,
    DokumentZgradeModule,
    SkladisteModule,
  ],
  controllers: [
    SastanakController,
    PrisustvoSastankaController,
    ZapisnikSastankaController,
  ],
  providers: [
    SastanakService,
    SastanakPravaService,
    PrisustvoSastankaService,
    ZapisnikSastankaService,
  ],
})
export class SastanakModule {}
