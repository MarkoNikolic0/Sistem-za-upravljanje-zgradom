import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Notifikacija } from './notifikacija.entity.js';
import { NotifikacijaController } from './notifikacija.controller.js';
import { NotifikacijaService } from './notifikacija.service.js';
import { NotifikacijaGateway } from './notifikacija.gateway.js';
import { NotifikacijaSubscriber } from './notifikacija.subscriber.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notifikacija]),
    forwardRef(() => AuthModule),
  ],
  controllers: [NotifikacijaController],
  providers: [NotifikacijaService, NotifikacijaGateway, NotifikacijaSubscriber],
  exports: [NotifikacijaService],
})
export class NotifikacijaModule {}
