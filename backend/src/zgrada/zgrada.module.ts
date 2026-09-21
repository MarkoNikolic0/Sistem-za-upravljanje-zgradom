import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Zgrada } from './zgrada.entity.js';
import { ZgradaController } from './zgrada.controller.js';
import { ZgradaService } from './zgrada.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Zgrada]), AuthModule],
  controllers: [ZgradaController],
  providers: [ZgradaService],
})
export class ZgradaModule {}
