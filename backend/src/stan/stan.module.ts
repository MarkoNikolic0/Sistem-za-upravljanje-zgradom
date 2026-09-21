import { Module } from '@nestjs/common';
import { StanController } from './stan.controller.js';
import { StanService } from './stan.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stan } from './stan.entity.js';
import { Zgrada } from '../zgrada/zgrada.entity.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Stan, Zgrada]), AuthModule],
  controllers: [StanController],
  providers: [StanService],
})
export class StanModule {}
