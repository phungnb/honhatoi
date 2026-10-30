import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class PinMessageDto {
  @IsBoolean()
  pinned: boolean;
}

export class BlockUserDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
