import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const REPORT_REASONS = ['spam', 'xuc_pham', 'sai_su_that', 'rieng_tu', 'lua_dao', 'khac'] as const;

export class CreateReportDto {
  @IsIn(['message', 'post', 'comment', 'user'])
  targetType: string;

  @IsUUID()
  targetId: string;

  @IsIn(REPORT_REASONS as unknown as string[])
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

export class HandleReportDto {
  /** dismiss: bỏ qua; remove: gỡ nội dung bị báo cáo rồi đóng báo cáo. */
  @IsIn(['dismiss', 'remove'])
  action: string;
}
