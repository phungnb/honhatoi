import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** Các giá trị event_type ở DB (enum EventType dùng @map). */
export const EVENT_TYPE_VALUES = [
  'ancestral_ceremony',
  'death_anniversary',
  'birthday',
  'family_meeting',
  'gathering',
  'other',
] as const;

export class CreateEventDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(EVENT_TYPE_VALUES as unknown as string[])
  eventType: string;

  @IsDateString()
  startAt: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  /** Ngày âm tương ứng (HNT-T-027) — tính ở client hoặc service lịch âm. */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  lunarDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;
}
