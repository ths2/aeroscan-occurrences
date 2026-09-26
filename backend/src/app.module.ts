import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { envConfig } from './config/env.config.js';
import { OccurrencesModule } from './occurrences/occurrences.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [envConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const mongodbUri = configService.get<string>('MONGODB_URI');

        if (!mongodbUri) {
          throw new Error(
            'Missing required environment variable: MONGODB_URI. Configure it in your .env file before starting the backend.',
          );
        }

        return { uri: mongodbUri };
      },
    }),
    OccurrencesModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? '',
      appSecret: process.env.OBSERVE_APP_SECRET ?? '',
      runtimeMetrics: !process.versions?.['webcontainer'],
      serviceId: 'nest-typescript-starter',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
