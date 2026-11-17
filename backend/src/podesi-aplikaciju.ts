import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import { KontaktSerializerInterceptor } from './korisnik/kontakt-serializer.interceptor.js';
import { greskeValidacije } from './shared/greske-validacije.js';
import { SocketIoAdapter } from './shared/socket-io.adapter.js';

export function podesiAplikaciju(app: INestApplication) {
  const frontend = app.get(ConfigService).get<string>('FRONTEND_URL');
  app.use(cookieParser());
  app.enableCors({ origin: frontend, credentials: true });
  app.useWebSocketAdapter(new SocketIoAdapter(app, frontend));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: greskeValidacije,
    }),
  );
  app.useGlobalInterceptors(
    new KontaktSerializerInterceptor(app.get(Reflector), app.get(DataSource)),
  );
}
