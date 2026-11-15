import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { podesiAplikaciju } from './podesi-aplikaciju.js';
import { SocketIoAdapter } from './shared/socket-io.adapter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  podesiAplikaciju(app);

  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL'),
    credentials: true,
  });

  app.useWebSocketAdapter(
    new SocketIoAdapter(app, configService.get<string>('FRONTEND_URL')),
  );

  const config = new DocumentBuilder()
    .setTitle('Sistem za upravljanje zgradom')
    .setDescription('API dokumentacija - diplomski rad')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
