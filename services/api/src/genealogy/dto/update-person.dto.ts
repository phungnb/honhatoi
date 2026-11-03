import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsOptional } from 'class-validator';
import { CreatePersonDto } from './create-person.dto';

export class UpdatePersonDto extends PartialType(CreatePersonDto) {
  /**
   * updatedAt của hồ sơ lúc người dùng mở form. Khác với hiện tại nghĩa là
   * đã có người sửa chen giữa → 409, không ghi đè.
   */
  @IsOptional()
  @IsDateString()
  expectedUpdatedAt?: string;
}
