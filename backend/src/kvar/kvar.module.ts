import { Module } from '@nestjs/common';
import { KvarController } from './kvar.controller.js';
import { KvarService } from './kvar.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kvar } from './kvar.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { Stan } from '../stan/stan.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Kvar, Korisnik, Stan]), AuthModule],
  controllers: [KvarController],
  providers: [KvarService]
})
export class KvarModule {}
