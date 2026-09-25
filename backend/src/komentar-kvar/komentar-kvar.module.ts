import { Module } from '@nestjs/common';
import { KomentarKvarController } from './komentar-kvar.controller.js';
import { KomentarKvarService } from './komentar-kvar.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KomentarKvar } from './komentar-kvar.entity.js';
import { Kvar } from '../kvar/kvar.entity.js';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([KomentarKvar, Kvar, Korisnik]),
    AuthModule,
  ],
  controllers: [KomentarKvarController],
  providers: [KomentarKvarService],
})
export class KomentarKvarModule {}
