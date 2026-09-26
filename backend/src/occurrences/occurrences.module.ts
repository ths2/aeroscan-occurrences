import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Occurrence, OccurrenceSchema } from './occurrence.schema.js';
import { OccurrencesController } from './occurrences.controller.js';
import { OccurrencesService } from './occurrences.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Occurrence.name, schema: OccurrenceSchema }]),
  ],
  controllers: [OccurrencesController],
  providers: [OccurrencesService],
  exports: [MongooseModule],
})
export class OccurrencesModule {}
