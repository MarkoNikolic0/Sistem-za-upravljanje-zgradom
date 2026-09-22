import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { AuthModule } from './auth/auth.module.js';
import { ZgradaController } from './zgrada/zgrada.controller.js';
import { ZgradaService } from './zgrada/zgrada.service.js';
import { ZgradaModule } from './zgrada/zgrada.module.js';
import { StanModule } from './stan/stan.module.js';
import { ZahtevPovezivanjeModule } from './zahtev-povezivanje/zahtev-povezivanje.module.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, //samo za razvoj na true
      }),
    }),
    AuthModule,
    ZgradaModule,
    StanModule,
    ZahtevPovezivanjeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
