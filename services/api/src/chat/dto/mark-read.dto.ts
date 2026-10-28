import { IsNotEmpty, IsString } from 'class-validator';

export class MarkReadDto {
  @IsString()
  @IsNotEmpty()
  messageId: string;
}
