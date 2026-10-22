import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  clientMessageId: string;

  @IsIn(['text', 'image', 'video', 'file', 'voice', 'system'])
  type: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @IsOptional()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}
