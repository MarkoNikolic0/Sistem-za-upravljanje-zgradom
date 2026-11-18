import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import type { Application } from 'express';
import { DataSource } from 'typeorm';
import { KontaktSerializerInterceptor } from './korisnik/kontakt-serializer.interceptor.js';
import { greskeValidacije } from './shared/greske-validacije.js';
import { SocketIoAdapter } from './shared/socket-io.adapter.js';

export const CORS_KES_SEKUNDI = 7200;

export function podesiAplikaciju(app: INestApplication) {
  const config = app.get(ConfigService);
  const frontend = config.get<string>('FRONTEND_URL');
  const proksiji = Number(config.get<string>('TRUST_PROXY') ?? 0);
  if (proksiji > 0) {
    const express: Application = app.getHttpAdapter().getInstance();
    express.set('trust proxy', proksiji);
  }
  app.use(cookieParser());
  app.enableCors({
    origin: frontend,
    credentials: true,
    maxAge: CORS_KES_SEKUNDI,
  });
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
