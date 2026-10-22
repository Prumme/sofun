import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module.js';
import type { RegisteredGame } from './engine/engine.js';

export async function createApplication(registry?: readonly RegisteredGame[], logger: false | undefined = undefined) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(registry), logger === false ? { logger: false } : {});
  const webDist = fileURLToPath(new URL('../../web/dist/', import.meta.url));
  if (existsSync(webDist)) {
    app.useStaticAssets(webDist);
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
      res.sendFile(`${webDist}/index.html`);
    });
  }
  app.enableShutdownHooks();
  return app;
}
