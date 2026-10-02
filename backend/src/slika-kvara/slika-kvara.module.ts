import { Module } from '@nestjs/common';
import { SlikaKvaraController } from './slika-kvara.controller.js';
import { SlikaKvaraService } from './slika-kvara.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlikaKvara } from './slika-kvara.entity.js';
import { Kvar } from '../kvar/kvar.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { KvarModule } from '../kvar/kvar.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([SlikaKvara]), KvarModule, AuthModule],
  controllers: [SlikaKvaraController],
  providers: [SlikaKvaraService],
})
export class SlikaKvaraModule {}
