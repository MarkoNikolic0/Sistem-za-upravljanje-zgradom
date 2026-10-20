import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PratilacKvara } from './pratilac-kvara.entity.js';
import { PratilacKvaraController } from './pratilac-kvara.controller.js';
import { PratilacKvaraService } from './pratilac-kvara.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { KvarModule } from '../kvar/kvar.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([PratilacKvara]), AuthModule, KvarModule],
  controllers: [PratilacKvaraController],
  providers: [PratilacKvaraService],
})
export class PratilacKvaraModule {}
