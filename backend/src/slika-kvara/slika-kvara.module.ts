import { Module } from '@nestjs/common';
import { SlikaKvaraController } from './slika-kvara.controller.js';
import { SlikaKvaraService } from './slika-kvara.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlikaKvara } from './slika-kvara.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { KvarModule } from '../kvar/kvar.module.js';
import { SkladisteModule } from '../shared/skladiste/skladiste.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([SlikaKvara]),
    KvarModule,
    AuthModule,
    SkladisteModule,
  ],
  controllers: [SlikaKvaraController],
  providers: [SlikaKvaraService],
})
export class SlikaKvaraModule {}
