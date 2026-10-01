import { Module } from '@nestjs/common';
import { ZahtevPovezivanjeController } from './zahtev-povezivanje.controller.js';
import { ZahtevPovezivanjeService } from './zahtev-povezivanje.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZahtevPovezivanje } from './zahtev-povezivanje.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { KorisnikModule } from '../korisnik/korisnik.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZahtevPovezivanje, Stan, StanarStana]),
    AuthModule,
    KorisnikModule,
  ],
  controllers: [ZahtevPovezivanjeController],
  providers: [ZahtevPovezivanjeService],
})
export class ZahtevPovezivanjeModule {}
