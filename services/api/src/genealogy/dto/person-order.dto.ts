import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

/** Danh sách id người theo thứ tự mới (trên xuống). */
export class PersonOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @IsUUID('all', { each: true })
  ids: string[];
}
