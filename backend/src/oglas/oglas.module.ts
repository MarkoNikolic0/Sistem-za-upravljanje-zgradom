import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Oglas } from './oglas.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { KorisnikModule } from '../korisnik/korisnik.module.js';
import { OglasController } from './oglas.controller.js';
import { OglasService } from './oglas.service.js';
import { PrilogOglasa } from './prilog-oglasa.entity.js';
import { PrilogOglasaService } from './prilog-oglasa.service.js';
import { OglasPravaService } from './oglas-prava.service.js';
import { OglasProcitanoService } from './oglas-procitano.service.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { SkladisteModule } from '../shared/skladiste/skladiste.module.js';
import { GlasanjeModule } from '../glasanje/glasanje.module.js';
import { NotifikacijaModule } from '../notifikacija/notifikacija.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Oglas, PrilogOglasa, Zgrada, Korisnik]),
    AuthModule,
    KorisnikModule,
    NotifikacijaModule,
    SkladisteModule,
    GlasanjeModule,
  ],
  controllers: [OglasController],
  providers: [
    OglasService,
    PrilogOglasaService,
    OglasPravaService,
    OglasProcitanoService,
  ],
  exports: [OglasService],
})
export class OglasModule {}
