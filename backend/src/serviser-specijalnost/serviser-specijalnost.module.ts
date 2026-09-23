import { Module } from '@nestjs/common';
import { ServiserSpecijalnostController } from './serviser-specijalnost.controller.js';
import { ServiserSpecijalnostService } from './serviser-specijalnost.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Korisnik } from '../korisnik/korisnik.entity.js';
import { ServiserSpecijalnost } from './serviser-specijalnost.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Korisnik, ServiserSpecijalnost]),
    AuthModule,
  ],
  controllers: [ServiserSpecijalnostController],
  providers: [ServiserSpecijalnostService],
})
export class ServiserSpecijalnostModule {}
