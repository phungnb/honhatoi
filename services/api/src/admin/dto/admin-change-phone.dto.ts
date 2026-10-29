import { IsNotEmpty, IsPhoneNumber, IsString, MaxLength } from 'class-validator';
import { NormalizePhone } from '../../common/phone';

export class AdminChangePhoneDto {
  @NormalizePhone()
  @IsPhoneNumber('VN')
  phone: string;

  /** Cách đã xác minh danh tính (vd: gọi video, CCCD) — ghi vào audit. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
