import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sastanak } from './sastanak.entity.js';
import { TackaDnevnogReda } from './tacka-dnevnog-reda.entity.js';
import { PotvrdaPrisustva } from './potvrda-prisustva.entity.js';
import { PrisutanStan } from './prisutan-stan.entity.js';
import { Glasanje } from '../glasanje/glasanje.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { KorisnikModule } from '../korisnik/korisnik.module.js';
import { GlasanjeModule } from '../glasanje/glasanje.module.js';
import { SastanakController } from './sastanak.controller.js';
import { SastanakService } from './sastanak.service.js';
import { SastanakPravaService } from './sastanak-prava.service.js';
import { PrisustvoSastankaController } from './prisustvo-sastanka.controller.js';
import { PrisustvoSastankaService } from './prisustvo-sastanka.service.js';

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
    ]),
    AuthModule,
    KorisnikModule,
    GlasanjeModule,
  ],
  controllers: [SastanakController, PrisustvoSastankaController],
  providers: [SastanakService, SastanakPravaService, PrisustvoSastankaService],
})
export class SastanakModule {}
