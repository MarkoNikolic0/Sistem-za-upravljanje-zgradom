import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Zgrada } from './zgrada.entity.js';
import { ZgradaController } from './zgrada.controller.js';
import { ZgradaService } from './zgrada.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { Stan } from '../stan/stan.entity.js';
import { Kvar } from '../kvar/kvar.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Zgrada, Stan, Kvar, Korisnik]),
    AuthModule,
  ],
  controllers: [ZgradaController],
  providers: [ZgradaService],
})
export class ZgradaModule {}
