import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Cổng Quản trị Nền tảng (Luồng 1 theo đánh giá chuyên gia 27/10/2026).
 *
 * Quyền super admin = cờ users.is_platform_admin, tách khỏi dòng họ; chỉ
 * bật bằng SQL, không có API nào cấp.
 * Chưa có tài khoản super admin thì endpoint trả 403 kèm mã rõ ràng —
 * không dùng dữ liệu mẫu để giả vờ.
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireSuperAdmin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPlatformAdmin: true },
    });
    if (!user?.isPlatformAdmin)
      throw new ForbiddenException({
        code: 'NOT_SUPER_ADMIN',
        message:
          'Tài khoản chưa có quyền quản trị nền tảng (users.is_platform_admin)',
      });
  }

  async listLineages(userId: string) {
    await this.requireSuperAdmin(userId);
    const lineages = await this.prisma.lineage.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        visibility: true,
        createdAt: true,
        _count: { select: { memberships: true, persons: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { data: { lineages }, error: null };
  }
}
