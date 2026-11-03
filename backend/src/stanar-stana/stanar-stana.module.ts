import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StanarStana } from './stanar-stana.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { KorisnikModule } from '../korisnik/korisnik.module.js';
import { StanarStanaController } from './stanar-stana.controller.js';
import { StanarStanaService } from './stanar-stana.service.js';
import { GlasanjeModule } from '../glasanje/glasanje.module.js';
import { PratilacKvaraModule } from '../pratilac-kvara/pratilac-kvara.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([StanarStana, Stan]),
    AuthModule,
    KorisnikModule,
    GlasanjeModule,
    PratilacKvaraModule,
  ],
  controllers: [StanarStanaController],
  providers: [StanarStanaService],
  exports: [StanarStanaService],
})
export class StanarStanaModule {}
