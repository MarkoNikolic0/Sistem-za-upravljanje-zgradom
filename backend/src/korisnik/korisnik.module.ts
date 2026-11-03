import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Korisnik } from './korisnik.entity.js';
import { KorisnikService } from './korisnik.service.js';
import { KorisnikController } from './korisnik.controller.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { ServiserSpecijalnost } from '../serviser-specijalnost/serviser-specijalnost.entity.js';
import { NalogKorisnikaService } from './nalog-korisnika.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Korisnik,
      StanarStana,
      Zgrada,
      ServiserSpecijalnost,
    ]),
    AuthModule,
  ],
  controllers: [KorisnikController],
  providers: [KorisnikService, NalogKorisnikaService],
  exports: [KorisnikService],
})
export class KorisnikModule {}
