import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['ancestral_ceremony', 'death_anniversary', 'birthday', 'family_meeting', 'gathering', 'other'])
  eventType: string;

  @IsDateString()
  startAt: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  /** Ngày âm tương ứng (HNT-T-027) — tính ở client hoặc service lịch âm. */
  @IsOptional()
  @IsString()
  lunarDate?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
