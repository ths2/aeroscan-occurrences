export type OccurrenceType =
  | 'intrusion'
  | 'perimeter_breach'
  | 'low_battery'
  | 'signal_loss';

export type OccurrenceStatus = 'open' | 'acknowledged' | 'resolved';
export type OccurrenceStatusFilter = OccurrenceStatus | 'all';

export interface Occurrence {
  _id: string;
  siteId: string;
  droneId: string;
  type: OccurrenceType;
  severity: number;
  status: OccurrenceStatus;
  detectedAt: string;
  priority: number;
  count: number;
  note?: string;
}
