import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Oglas } from './oglas.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { KorisnikModule } from '../korisnik/korisnik.module.js';
import { OglasController } from './oglas.controller.js';
import { OglasService } from './oglas.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Oglas, StanarStana, Zgrada]),
    AuthModule,
    KorisnikModule,
  ],
  controllers: [OglasController],
  providers: [OglasService],
})
export class OglasModule {}
