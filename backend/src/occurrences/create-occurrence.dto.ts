import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { OccurrenceType } from './occurrence.schema.js';

export class CreateOccurrenceDto {
  @IsString()
  @IsNotEmpty()
  siteId: string;

  @IsString()
  @IsNotEmpty()
  droneId: string;

  @IsEnum(OccurrenceType)
  type: OccurrenceType;

  @IsInt()
  @Min(1)
  @Max(5)
  severity: number;

  @IsDateString()
  detectedAt: string;
}
