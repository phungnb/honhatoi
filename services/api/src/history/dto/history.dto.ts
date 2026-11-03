import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class HistoryEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  period?: string;

  @IsString()
  @MaxLength(20000)
  content: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export const CEREMONY_KINDS = ['gio_to', 'gio_ho', 'gio_chi', 'tao_mo', 'khac'] as const;

export class CeremonyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsIn(CEREMONY_KINDS)
  kind: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  lunarDay: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  lunarMonth: number;

  @IsOptional()
  @IsBoolean()
  lunarLeap?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  branch?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
