import { Body, Controller, Post } from '@nestjs/common';
import { CreateOccurrenceDto } from './create-occurrence.dto.js';
import { Occurrence } from './occurrence.schema.js';
import { OccurrencesService } from './occurrences.service.js';

@Controller('occurrences')
export class OccurrencesController {
  constructor(private readonly occurrencesService: OccurrencesService) {}

  @Post()
  async create(@Body() createOccurrenceDto: CreateOccurrenceDto): Promise<Occurrence> {
    return this.occurrencesService.createOccurrence(createOccurrenceDto);
  }
}
