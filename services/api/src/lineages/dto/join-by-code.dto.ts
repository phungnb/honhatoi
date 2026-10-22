import { IsNotEmpty, IsString } from 'class-validator';

export class JoinByCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
