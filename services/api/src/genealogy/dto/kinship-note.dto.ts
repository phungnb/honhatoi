import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class KinshipNoteDto {
  @IsUUID()
  fromId: string;

  @IsUUID()
  toId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
