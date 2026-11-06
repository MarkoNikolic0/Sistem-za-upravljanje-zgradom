import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DokumentZgrade } from './dokument-zgrade.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { KorisnikModule } from '../korisnik/korisnik.module.js';
import { SkladisteModule } from '../shared/skladiste/skladiste.module.js';
import { DokumentZgradeController } from './dokument-zgrade.controller.js';
import { DokumentZgradeService } from './dokument-zgrade.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([DokumentZgrade]),
    AuthModule,
    KorisnikModule,
    SkladisteModule,
  ],
  controllers: [DokumentZgradeController],
  providers: [DokumentZgradeService],
})
export class DokumentZgradeModule {}
