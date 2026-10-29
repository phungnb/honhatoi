import { IsIn, IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';
import { NormalizePhone } from '../../common/phone';

export class RequestOtpDto {
  @NormalizePhone()
  @IsPhoneNumber('VN')
  phone: string;

  @IsIn(['register', 'login', 'recover'])
  purpose: 'register' | 'login' | 'recover';
}
