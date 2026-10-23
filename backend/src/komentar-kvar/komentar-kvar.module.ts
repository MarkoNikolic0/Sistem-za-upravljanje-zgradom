import { Module } from '@nestjs/common';
import { KomentarKvarController } from './komentar-kvar.controller.js';
import { KomentarKvarService } from './komentar-kvar.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KomentarKvar } from './komentar-kvar.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { KvarModule } from '../kvar/kvar.module.js';
import { PromenaStatusaKvara } from '../kvar/promena-statusa-kvara.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([KomentarKvar, PromenaStatusaKvara]),
    AuthModule,
    KvarModule,
  ],
  controllers: [KomentarKvarController],
  providers: [KomentarKvarService],
})
export class KomentarKvarModule {}
