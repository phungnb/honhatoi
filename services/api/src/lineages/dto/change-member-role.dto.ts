import { IsIn, IsString } from 'class-validator';

export class ChangeMemberRoleDto {
  @IsString()
  @IsIn([
    'GUEST',
    'APP_MEMBER',
    'MEMBER',
    'GENEALOGY_MANAGER',
    'ADMIN',
    'SENIOR_ADMIN',
    'SYSTEM_ADMIN',
  ])
  role: string;
}
