import { Module } from '@nestjs/common';
import { KvarController } from './kvar.controller.js';
import { KvarService } from './kvar.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kvar } from './kvar.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { ServiserSpecijalnost } from '../serviser-specijalnost/serviser-specijalnost.entity.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { KorisnikModule } from '../korisnik/korisnik.module.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { PromenaStatusaKvara } from './promena-statusa-kvara.entity.js';
import { KvarPravaService } from './kvar-prava.service.js';
import { KvarAkcijeService } from './kvar-akcije.service.js';
import { PratilacKvara } from '../pratilac-kvara/pratilac-kvara.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Kvar,
      ServiserSpecijalnost,
      StanarStana,
      Zgrada,
      PromenaStatusaKvara,
      PratilacKvara,
    ]),
    AuthModule,
    KorisnikModule,
  ],
  controllers: [KvarController],
  providers: [KvarService, KvarPravaService, KvarAkcijeService],
  exports: [KvarService, KvarPravaService],
})
export class KvarModule {}
