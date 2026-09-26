import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Occurrence, OccurrenceSchema } from './occurrence.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Occurrence.name, schema: OccurrenceSchema }]),
  ],
  exports: [MongooseModule],
})
export class OccurrencesModule {}
