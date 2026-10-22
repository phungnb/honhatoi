import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRelationshipDto {
  @IsUUID()
  personId: string;

  @IsUUID()
  relatedPersonId: string;

  @IsIn(['parent', 'child', 'spouse', 'adoptive_parent', 'adoptive_child', 'ex_spouse'])
  relationshipType: string;

  @IsOptional()
  @IsString()
  note?: string;
}
