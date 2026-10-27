import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Ghi chú của người duyệt khi duyệt/từ chối đề xuất.
 * Với từ chối, ghi chú là bắt buộc về mặt nghiệp vụ (Trưởng tộc phải giải
 * thích lý do) — UI ép nhập, backend vẫn cho phép trống để không phá các
 * client cũ gọi không kèm body.
 */
export class ReviewProposalDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
