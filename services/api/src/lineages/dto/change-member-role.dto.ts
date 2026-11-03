import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ChangeMemberRoleDto {
  @IsString()
  @IsIn(['MEMBER', 'EDITOR', 'ADMIN'])
  role: string;
}

export class SetMemberTitleDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string | null;
}
