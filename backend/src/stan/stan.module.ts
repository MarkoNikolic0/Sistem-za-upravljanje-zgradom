import { Module } from '@nestjs/common';
import { StanController } from './stan.controller.js';
import { StanService } from './stan.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stan } from './stan.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { KorisnikModule } from '../korisnik/korisnik.module.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { Kvar } from '../kvar/kvar.entity.js';
import { ZahtevPovezivanje } from '../zahtev-povezivanje/zahtev-povezivanje.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Stan,
      Zgrada,
      StanarStana,
      Kvar,
      ZahtevPovezivanje,
    ]),
    AuthModule,
    KorisnikModule,
  ],
  controllers: [StanController],
  providers: [StanService],
})
export class StanModule {}
