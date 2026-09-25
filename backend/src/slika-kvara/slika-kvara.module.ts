import { Module } from '@nestjs/common';
import { SlikaKvaraController } from './slika-kvara.controller.js';
import { SlikaKvaraService } from './slika-kvara.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlikaKvara } from './slika-kvara.entity.js';
import { Kvar } from '../kvar/kvar.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([SlikaKvara, Kvar]), AuthModule],
  controllers: [SlikaKvaraController],
  providers: [SlikaKvaraService],
})
export class SlikaKvaraModule {}
