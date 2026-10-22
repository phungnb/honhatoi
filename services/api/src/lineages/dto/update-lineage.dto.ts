import { PartialType } from '@nestjs/mapped-types';
import { CreateLineageDto } from './create-lineage.dto';

export class UpdateLineageDto extends PartialType(CreateLineageDto) {}
