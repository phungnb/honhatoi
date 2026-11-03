import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePersonDto {
  @IsString()
  @MaxLength(150)
  fullName: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsBoolean()
  birthYearOnly?: boolean;

  @IsOptional()
  @IsDateString()
  dateOfDeath?: string;

  @IsOptional()
  @IsString()
  hometown?: string;

  @IsOptional()
  @IsString()
  burialPlace?: string;

  /** Ngày mất âm lịch (1–30), dùng tính ngày giỗ khi không rõ ngày dương. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  deathLunarDay?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  deathLunarMonth?: number | null;

  @IsOptional()
  @IsBoolean()
  deathLunarLeap?: boolean;

  @IsOptional()
  @IsInt()
  generation?: number;

  @IsOptional()
  @IsString()
  branch?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  currentPlace?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  education?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  roleInLineage?: string;

  @IsOptional()
  @IsString()
  hobbies?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;
}
