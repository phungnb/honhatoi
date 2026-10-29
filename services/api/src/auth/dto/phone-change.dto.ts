import { IsOptional, IsPhoneNumber, IsString, Length } from 'class-validator';

export class RequestPhoneChangeDto {
  @IsPhoneNumber('VN')
  newPhone: string;
}

export class ConfirmPhoneChangeDto {
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
