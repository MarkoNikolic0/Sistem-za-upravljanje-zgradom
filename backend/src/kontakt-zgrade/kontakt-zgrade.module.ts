import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KontaktZgrade } from './kontakt-zgrade.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { KorisnikModule } from '../korisnik/korisnik.module.js';
import { KontaktZgradeController } from './kontakt-zgrade.controller.js';
import { KontaktZgradeService } from './kontakt-zgrade.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([KontaktZgrade, Zgrada]),
    AuthModule,
    KorisnikModule,
  ],
  controllers: [KontaktZgradeController],
  providers: [KontaktZgradeService],
})
export class KontaktZgradeModule {}
