import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class EmailRegisterDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  devicePlatform?: string;
}

export class EmailLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  devicePlatform?: string;
}

/** Thêm/đổi email + mật khẩu cho tài khoản đang đăng nhập. */
export class SetPasswordDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  /** Bắt buộc nếu tài khoản đã có mật khẩu. */
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

export class GoogleLoginDto {
  /** ID token (JWT) do Google Identity Services trả về ở client. */
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  devicePlatform?: string;
}

/** Ghi nhận đồng ý Điều khoản + Chính sách quyền riêng tư (phiên bản đang hiển thị). */
export class ConsentDto {
  @IsString()
  @MaxLength(20)
  version: string;
}

/** Đổi tên hiển thị của tài khoản đang đăng nhập. */
export class UpdateMeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName: string;
}
