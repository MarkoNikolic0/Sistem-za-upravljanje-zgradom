import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { KontaktSerializerInterceptor } from './korisnik/kontakt-serializer.interceptor.js';
import { greskeValidacije } from './shared/greske-validacije.js';

export function podesiAplikaciju(app: INestApplication) {
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: greskeValidacije,
    }),
  );
  app.useGlobalInterceptors(
    new KontaktSerializerInterceptor(app.get(Reflector)),
  );
}
