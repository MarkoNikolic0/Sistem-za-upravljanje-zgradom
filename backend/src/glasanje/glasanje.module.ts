import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Glasanje } from './glasanje.entity.js';
import { OpcijaGlasanja } from './opcija-glasanja.entity.js';
import { Glas } from './glas.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { KorisnikModule } from '../korisnik/korisnik.module.js';
import { GlasanjeController } from './glasanje.controller.js';
import { GlasanjeService } from './glasanje.service.js';
import { GlasanjeGlasoviService } from './glasanje-glasovi.service.js';
import { GlasanjePravaService } from './glasanje-prava.service.js';
import { GlasanjeRezultatiService } from './glasanje-rezultati.service.js';
import { Stan } from '../stan/stan.entity.js';
import { Oglas } from '../oglas/oglas.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Glasanje,
      OpcijaGlasanja,
      Glas,
      StanarStana,
      Stan,
      Zgrada,
      Oglas,
    ]),
    AuthModule,
    KorisnikModule,
  ],
  controllers: [GlasanjeController],
  providers: [
    GlasanjeService,
    GlasanjeGlasoviService,
    GlasanjePravaService,
    GlasanjeRezultatiService,
  ],
  exports: [GlasanjeService],
})
export class GlasanjeModule {}
