import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { corsOrigins } from './common/cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Sau reverse proxy (nginx/Vercel): lấy IP thật từ X-Forwarded-For để
  // giới hạn tần suất theo từng người, không theo IP của proxy.
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  // Chuẩn response theo spec 3.1 — mọi endpoint dưới /api/v1.
  app.setGlobalPrefix('api/v1');

  // Validate toàn cục cho mọi DTO (class-validator).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`HONHATOI API listening on :${port} (prefix /api/v1)`);
}
bootstrap();
