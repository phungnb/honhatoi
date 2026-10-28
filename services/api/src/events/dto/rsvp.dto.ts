import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class RsvpDto {
  @IsIn(['attending', 'maybe', 'declined'])
  status: 'attending' | 'maybe' | 'declined';

  /**
   * Số khách đi cùng. Schema EventParticipant KHÔNG có cột này nên service
   * hiện tại bỏ qua — giữ field để tương thích API sau này khi thêm cột.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  guestCount?: number;
}
