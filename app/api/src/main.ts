import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    // Capture the raw body for the Stripe webhook signature check.
    bodyParser: true,
    rawBody: true,
  });

  app.enableCors({ origin: '*' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  // Preserve the raw body on req.rawBody for the webhook (NestFactory rawBody
  // already does this for supported content types; this is a defensive shim).
  app.use((req: Request & { rawBody?: Buffer }, _res: Response, next: NextFunction) => {
    if (!req.rawBody && Buffer.isBuffer((req as any).body)) {
      req.rawBody = (req as any).body;
    }
    next();
  });

  const config = app.get(AppConfigService);
  const port = config.apiPort;
  await app.listen(port);
  logger.log(`YT Shorts Clips API listening on http://localhost:${port}`);
  logger.log(`Health:  GET  http://localhost:${port}/health`);
  logger.log(`Jobs:    POST http://localhost:${port}/jobs`);
  logger.log(`WS:      ws://localhost:${port}/ws  (emit "subscribe" { job_id })`);
}

void bootstrap();
