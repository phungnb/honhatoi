import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Loại bài trên bảng tin (đặc tả 3.6): thông báo, hoạt động, tư liệu, kỷ niệm, tìm người thân. */
export const POST_CATEGORIES = ['thong_bao', 'hoat_dong', 'tu_lieu', 'ky_niem', 'tim_nguoi_than'] as const;

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @IsIn(POST_CATEGORIES)
  category: (typeof POST_CATEGORIES)[number];
}

export class PinPostDto {
  @IsBoolean()
  pinned: boolean;
}

export class ReactPostDto {
  @IsIn(['like', 'love', 'haha', 'wow', 'sad', 'pray'])
  emoji: string;
}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
