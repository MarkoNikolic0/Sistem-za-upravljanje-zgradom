import { Module } from '@nestjs/common';
import { ZahtevPovezivanjeController } from './zahtev-povezivanje.controller.js';
import { ZahtevPovezivanjeService } from './zahtev-povezivanje.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZahtevPovezivanje } from './zahtev-povezivanje.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([ZahtevPovezivanje, Stan, Korisnik]), AuthModule],
  controllers: [ZahtevPovezivanjeController],
  providers: [ZahtevPovezivanjeService]
})
export class ZahtevPovezivanjeModule {}
