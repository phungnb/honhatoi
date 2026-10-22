import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLineageDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  branchName?: string;

  @IsOptional()
  @IsString()
  hometownProvince?: string;

  @IsOptional()
  @IsString()
  hometownCommune?: string;

  @IsOptional()
  @IsString()
  ancestralHallAddress?: string;

  @IsOptional()
  @IsIn(['private', 'invite_only', 'partial_public'])
  visibility?: string;
}
