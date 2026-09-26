import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateOccurrenceDto } from './create-occurrence.dto.js';
import { Occurrence, OccurrenceDocument, OccurrenceStatus } from './occurrence.schema.js';

@Injectable()
export class OccurrencesService {
  constructor(
    @InjectModel(Occurrence.name)
    private readonly occurrenceModel: Model<OccurrenceDocument>,
  ) {}

  async createOccurrence(dto: CreateOccurrenceDto): Promise<OccurrenceDocument> {
    const detectedAt = new Date(dto.detectedAt);
    const windowStart = new Date(detectedAt.getTime() - 10 * 60 * 1000);

    const existing = await this.occurrenceModel.findOne({
      siteId: dto.siteId,
      type: dto.type,
      status: OccurrenceStatus.OPEN,
      detectedAt: { $gte: windowStart, $lte: detectedAt },
    }).sort({ detectedAt: -1 });

    if (!existing) {
      const created = await this.occurrenceModel.create({
        siteId: dto.siteId,
        droneId: dto.droneId,
        type: dto.type,
        severity: dto.severity,
        detectedAt,
        status: OccurrenceStatus.OPEN,
        count: 1,
      });

      return created;
    }

    existing.count += 1;
    existing.severity = Math.min(existing.severity + 1, 5);
    existing.detectedAt = detectedAt;

    await existing.save();

    return existing;
  }
}
