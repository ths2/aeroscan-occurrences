import { INestApplication } from '@nestjs/common';

export function configureCors(app: INestApplication): void {
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}
