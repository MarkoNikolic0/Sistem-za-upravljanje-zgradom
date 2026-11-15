import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { podesiAplikaciju } from './podesi-aplikaciju.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  podesiAplikaciju(app);

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
