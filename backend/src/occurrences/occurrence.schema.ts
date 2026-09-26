import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum OccurrenceType {
  INTRUSION = 'intrusion',
  PERIMETER_BREACH = 'perimeter_breach',
  LOW_BATTERY = 'low_battery',
  SIGNAL_LOSS = 'signal_loss',
}

export enum OccurrenceStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

export type OccurrencePriority = number;

@Schema({
  collection: 'occurrences',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Occurrence {
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  siteId: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  droneId: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(OccurrenceType),
  })
  type: OccurrenceType;

  @Prop({
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: (value: number) => Number.isInteger(value),
      message: 'severity must be an integer between 1 and 5',
    },
  })
  severity: number;

  @Prop({
    type: Date,
    required: true,
  })
  detectedAt: Date;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(OccurrenceStatus),
    default: OccurrenceStatus.OPEN,
  })
  status: OccurrenceStatus;

  @Prop({
    type: Number,
    required: true,
    min: 1,
    default: 1,
  })
  count: number;

  @Prop({
    type: String,
    trim: true,
    default: '',
  })
  note?: string;
}

export type OccurrenceDocument = HydratedDocument<Occurrence>;

export const OccurrenceSchema = SchemaFactory.createForClass(Occurrence);

OccurrenceSchema.index({ siteId: 1, type: 1, status: 1, detectedAt: -1 });
