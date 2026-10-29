import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AdminResetPasswordDto {
  /** Cách đã xác minh danh tính — ghi vào audit. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
