import { IsOptional, IsString } from 'class-validator';

export class JoinRequestDto {
  @IsOptional()
  @IsString()
  requestedBranch?: string;

  @IsOptional()
  @IsString()
  requestedRelation?: string;
}
