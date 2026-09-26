import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateOccurrenceDto } from './create-occurrence.dto.js';
import { Occurrence, OccurrenceDocument, OccurrenceStatus, OccurrenceType } from './occurrence.schema.js';

const TYPE_WEIGHT: Record<OccurrenceType, number> = {
  [OccurrenceType.INTRUSION]: 3,
  [OccurrenceType.PERIMETER_BREACH]: 2,
  [OccurrenceType.LOW_BATTERY]: 1,
  [OccurrenceType.SIGNAL_LOSS]: 1,
};

type OccurrenceListItem = Occurrence & {
  priority: number;
  _id?: unknown;
};

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

  async findOccurrences(filters: { status?: OccurrenceStatus; siteId?: string } = {}): Promise<OccurrenceListItem[]> {
    const query: { status?: OccurrenceStatus; siteId?: string } = {};

    if (filters.status !== undefined) {
      query.status = filters.status;
    }

    if (filters.siteId !== undefined) {
      query.siteId = filters.siteId;
    }

    const occurrences = await this.occurrenceModel.find(query).exec();

    return occurrences
      .map((occurrence) => {
        const plain = occurrence.toObject() as Occurrence & { _id?: unknown };

        return {
          ...plain,
          priority: plain.severity * TYPE_WEIGHT[plain.type],
        } satisfies OccurrenceListItem;
      })
      .sort((left, right) => {
        if (right.priority !== left.priority) {
          return right.priority - left.priority;
        }

        return new Date(right.detectedAt).getTime() - new Date(left.detectedAt).getTime();
      });
  }

  async updateOccurrenceStatus(
    id: string,
    nextStatus: OccurrenceStatus,
    note?: string,
  ): Promise<OccurrenceDocument> {
    let occurrence: OccurrenceDocument | null;

    try {
      occurrence = await this.occurrenceModel.findById(id);
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'CastError') {
        throw new BadRequestException('Invalid occurrence id.');
      }

      throw error;
    }

    if (!occurrence) {
      throw new NotFoundException(`Occurrence with id ${id} not found.`);
    }

    const allowedTransitions: Partial<Record<OccurrenceStatus, OccurrenceStatus>> = {
      [OccurrenceStatus.OPEN]: OccurrenceStatus.ACKNOWLEDGED,
      [OccurrenceStatus.ACKNOWLEDGED]: OccurrenceStatus.RESOLVED,
    };

    const currentStatus = occurrence.status;
    const isValidTransition = allowedTransitions[currentStatus] === nextStatus;

    if (!isValidTransition) {
      throw new ConflictException(
        `Invalid status transition from ${currentStatus} to ${nextStatus}. Allowed transitions: open -> acknowledged, acknowledged -> resolved.`,
      );
    }

    if (nextStatus === OccurrenceStatus.RESOLVED) {
      const trimmedNote = note?.trim() ?? '';

      if (trimmedNote.length === 0) {
        throw new BadRequestException('A non-empty note is required to resolve an occurrence.');
      }

      occurrence.note = trimmedNote;
    }

    occurrence.status = nextStatus;
    await occurrence.save();

    return occurrence;
  }
}
