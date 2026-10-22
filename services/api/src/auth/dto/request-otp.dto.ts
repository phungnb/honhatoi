import { IsIn, IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';

export class RequestOtpDto {
  @IsPhoneNumber('VN')
  phone: string;

  @IsIn(['register', 'login', 'recover'])
  purpose: 'register' | 'login' | 'recover';
}
