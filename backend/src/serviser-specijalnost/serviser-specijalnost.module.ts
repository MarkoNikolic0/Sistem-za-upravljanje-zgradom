import { Module } from '@nestjs/common';
import { ServiserSpecijalnostController } from './serviser-specijalnost.controller.js';
import { ServiserSpecijalnostService } from './serviser-specijalnost.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ServiserSpecijalnostController],
  providers: [ServiserSpecijalnostService],
})
export class ServiserSpecijalnostModule {}
