import { Module } from '@nestjs/common';
import { KvarController } from './kvar.controller.js';
import { KvarService } from './kvar.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kvar } from './kvar.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { ServiserSpecijalnost } from '../serviser-specijalnost/serviser-specijalnost.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { KorisnikModule } from '../korisnik/korisnik.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Kvar,
      Korisnik,
      Stan,
      ServiserSpecijalnost,
      StanarStana,
    ]),
    AuthModule,
    KorisnikModule,
  ],
  controllers: [KvarController],
  providers: [KvarService],
  exports: [KvarService],
})
export class KvarModule {}
