import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sastanak } from './sastanak.entity.js';
import { TackaDnevnogReda } from './tacka-dnevnog-reda.entity.js';
import { Glasanje } from '../glasanje/glasanje.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { KorisnikModule } from '../korisnik/korisnik.module.js';
import { GlasanjeModule } from '../glasanje/glasanje.module.js';
import { SastanakController } from './sastanak.controller.js';
import { SastanakService } from './sastanak.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sastanak, TackaDnevnogReda, Glasanje, Zgrada]),
    AuthModule,
    KorisnikModule,
    GlasanjeModule,
  ],
  controllers: [SastanakController],
  providers: [SastanakService],
})
export class SastanakModule {}
