import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Korisnik } from './korisnik.entity.js';
import { KorisnikService } from './korisnik.service.js';
import { KorisnikController } from './korisnik.controller.js';
import { StanarStana } from '../stanar-stana/stanar-stana.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Korisnik, StanarStana]), AuthModule],
  controllers: [KorisnikController],
  providers: [KorisnikService],
  exports: [KorisnikService],
})
export class KorisnikModule {}
