import { IsIn, IsString } from 'class-validator';

export class ChangeMemberRoleDto {
  @IsString()
  @IsIn(['MEMBER', 'EDITOR', 'ADMIN'])
  role: string;
}
