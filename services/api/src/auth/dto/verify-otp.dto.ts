import { IsOptional, IsPhoneNumber, IsString, Length } from 'class-validator';
import { NormalizePhone } from '../../common/phone';

export class VerifyOtpDto {
  @NormalizePhone()
  @IsPhoneNumber('VN')
  phone: string;

  @IsString()
  @Length(6, 6)
  code: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  devicePlatform?: string;
}
