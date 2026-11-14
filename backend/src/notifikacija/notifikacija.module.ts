import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Notifikacija } from './notifikacija.entity.js';
import { NotifikacijaController } from './notifikacija.controller.js';
import { NotifikacijaService } from './notifikacija.service.js';
import { NotifikacijaGateway } from './notifikacija.gateway.js';
import { NotifikacijaSubscriber } from './notifikacija.subscriber.js';
import { PushPretplata } from './push/push-pretplata.entity.js';
import { PushService } from './push/push.service.js';
import { RefreshToken } from '../auth/refresh-token/refresh-token.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notifikacija, PushPretplata, RefreshToken]),
    forwardRef(() => AuthModule),
  ],
  controllers: [NotifikacijaController],
  providers: [
    NotifikacijaService,
    NotifikacijaGateway,
    NotifikacijaSubscriber,
    PushService,
  ],
  exports: [NotifikacijaService, NotifikacijaGateway, PushService],
})
export class NotifikacijaModule {}
