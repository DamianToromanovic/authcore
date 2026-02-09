import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, //entfernt Felder die nicht im DTO sind
      forbidNonWhitelisted: true, // wirft 400 sobald ein feld existiert was nicht im DTO ist
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
