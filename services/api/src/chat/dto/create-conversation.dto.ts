import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @IsIn(['direct', 'lineage_group', 'family_group'])
  type: string;

  @IsOptional()
  @IsUUID()
  lineageId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsUUID('4', { each: true })
  memberIds?: string[];
}
