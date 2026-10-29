import { IsOptional, IsPhoneNumber, IsString, Length } from 'class-validator';
import { NormalizePhone } from '../../common/phone';

export class RequestPhoneChangeDto {
  @NormalizePhone()
  @IsPhoneNumber('VN')
  newPhone: string;
}

export class ConfirmPhoneChangeDto {
  @NormalizePhone()
  @IsPhoneNumber('VN')
  newPhone: string;

  /** Mã gửi tới số cũ — bắt buộc nếu tài khoản đang có số. */
  @IsOptional()
  @IsString()
  @Length(6, 6)
  oldCode?: string;

  @IsString()
  @Length(6, 6)
  newCode: string;
}
