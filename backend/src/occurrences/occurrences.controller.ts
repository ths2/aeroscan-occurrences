import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateOccurrenceDto } from './create-occurrence.dto.js';
import { Occurrence, OccurrenceStatus } from './occurrence.schema.js';
import { OccurrencesService } from './occurrences.service.js';

@Controller('occurrences')
export class OccurrencesController {
  constructor(private readonly occurrencesService: OccurrencesService) {}

  @Post()
  async create(@Body() createOccurrenceDto: CreateOccurrenceDto): Promise<Occurrence> {
    return this.occurrencesService.createOccurrence(createOccurrenceDto);
  }

  @Get()
  async findAll(@Query('status') status?: string, @Query('siteId') siteId?: string) {
    if (status !== undefined && !Object.values(OccurrenceStatus).includes(status as OccurrenceStatus)) {
      throw new BadRequestException('Invalid status value. Allowed values: open, acknowledged, resolved.');
    }

    return this.occurrencesService.findOccurrences({
      status: status as OccurrenceStatus | undefined,
      siteId,
    });
  }
}
