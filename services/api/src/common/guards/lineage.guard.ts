import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * LineageGuard — CÔ LẬP DỮ LIỆU GIỮA CÁC DÒNG HỌ (HNT-T-010).
 *
 * Mọi request có `:lineageId` (param) hoặc `lineageId`/`lineage_id` (body/query)
 * đều phải đi qua guard này. Guard kiểm tra: user hiện tại có
 * lineage_memberships với status='approved' cho lineage đó hay không.
 * Không có membership hợp lệ → 403, tuyệt đối không để lọt dữ liệu họ khác.
 *
 * TODO chi tiết khi triển khai đầy đủ:
 *  1. Lấy userId từ request.user.sub (do JwtAuthGuard gắn sau khi verify JWT).
 *  2. Lấy lineageId theo thứ tự ưu tiên: req.params.lineageId
 *     → req.body.lineageId → req.query.lineageId.
 *     Nếu không có lineageId nào → cho qua (guard không áp dụng).
 *  3. Truy vấn: prisma.lineageMembership.findFirst({
 *       where: { lineageId, userId, status: 'approved' } })
 *     Nếu không thấy → throw ForbiddenException { code: 'NOT_LINEAGE_MEMBER' }.
 *  4. Gắn kết quả vào request để controller/service tái sử dụng, tránh query lại:
 *       req.lineageMembership = membership  // { role, ... }
 *  5. KHÔNG cache quyền quá lâu: mỗi request kiểm tra lại DB (hoặc cache ngắn
 *     ≤ 60s kèm cơ chế vô hiệu khi đổi role/xóa thành viên).
 *  6. Với endpoint lồng nhau (ví dụ /persons/:id thuộc lineage nào), service
 *     phải resolve lineageId từ bản ghi rồi kiểm tra membership tương ứng —
 *     không tin lineageId do client gửi mà không đối chiếu.
 *  7. Kiểm thử IDOR bắt buộc: user chỉ là thành viên họ A gọi API với
 *     lineageId của họ B → phải nhận 403 (HNT-T-010).
 *
 * Cách dùng: @UseGuards(JwtAuthGuard, LineageGuard)
 */
@Injectable()
export class LineageGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.sub;
    const lineageId: string | undefined =
      req.params?.lineageId ?? req.body?.lineageId ?? req.query?.lineageId;

    // Không có lineageId trong request → guard không áp dụng.
    if (!lineageId) return true;
    if (!userId) {
      throw new ForbiddenException({
        code: 'UNAUTHENTICATED',
        message: 'Chưa xác thực người dùng',
      });
    }

    const membership = await this.prisma.lineageMembership.findFirst({
      where: { lineageId, userId, status: 'approved' },
      select: { id: true, role: true, status: true },
    });

    if (!membership) {
      // TODO: ghi audit log cho truy cập bị từ chối (phát hiện dò quét IDOR).
      throw new ForbiddenException({
        code: 'NOT_LINEAGE_MEMBER',
        message:
          'Bạn không phải thành viên được duyệt của dòng họ này — không thể truy cập dữ liệu của họ khác',
      });
    }

    req.lineageMembership = membership;
    return true;
  }
}
