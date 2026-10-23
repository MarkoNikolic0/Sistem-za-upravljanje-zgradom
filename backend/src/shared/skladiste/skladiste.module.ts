import { Module } from '@nestjs/common';
import { SkladisteService } from './skladiste.service.js';

@Module({
  providers: [SkladisteService],
  exports: [SkladisteService],
})
export class SkladisteModule {}
