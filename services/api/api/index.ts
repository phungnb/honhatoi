import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from '../dist/app.module';
import { corsOrigins } from '../dist/common/cors';

/**
 * Entry point cho Vercel Serverless Functions.
 *
 * Khởi tạo NestJS một lần duy nhất rồi giữ ấm giữa các invocation.
 * Mọi request /api/v1/* được rewrite về function này (xem vercel.json).
 *
 * Lưu ý: WebSocket (chat realtime qua Socket.io) KHÔNG hoạt động trên
 * serverless — các API REST vẫn chạy bình thường.
 */
const expressApp = express();
let ready: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ['error', 'warn'] },
  );
  // Giữ đúng prefix như khi chạy local (spec 3.1).
  app.setGlobalPrefix('api/v1');
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
  await app.init();
}

export default async function handler(req: any, res: any) {
  if (!ready) ready = bootstrap();
  await ready;
  expressApp(req, res);
}
