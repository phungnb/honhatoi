import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProposalDto {
  @IsIn(['create_person', 'update_person', 'delete_person', 'create_relationship', 'delete_relationship'])
  requestType: string;

  @IsOptional()
  @IsUUID()
  personId?: string;

  @IsOptional()
  @IsUUID()
  relationshipId?: string;

  /** Chứa before/after đầy đủ — đồng thời là lịch sử chỉnh sửa (GP-09). */
  @IsObject()
  @IsNotEmpty()
  payload: Record<string, unknown>;

  @IsOptional()
  @IsString()
  reason?: string;
}
