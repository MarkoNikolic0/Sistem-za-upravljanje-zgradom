import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Korisnik } from './korisnik.entity.js';
import { KorisnikService } from './korisnik.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Korisnik])],
  providers: [KorisnikService],
  exports: [KorisnikService],
})
export class KorisnikModule {}
