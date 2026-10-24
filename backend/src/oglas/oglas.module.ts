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
import { SkladisteModule } from '../shared/skladiste/skladiste.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Oglas, PrilogOglasa, Zgrada]),
    AuthModule,
    KorisnikModule,
    SkladisteModule,
  ],
  controllers: [OglasController],
  providers: [OglasService, PrilogOglasaService],
})
export class OglasModule {}
