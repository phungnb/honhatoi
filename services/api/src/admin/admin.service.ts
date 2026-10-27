import { ForbiddenException, Injectable } from '@nestjs/common';
import { LineageRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Cổng Quản trị Nền tảng (Luồng 1 theo đánh giá chuyên gia 27/10/2026).
 *
 * Quyền super admin hiện gắn với membership có vai trò SYSTEM_ADMIN ở
 * bất kỳ dòng họ nào (người vận hành nền tảng được cấp vai trò này).
 * Chưa có tài khoản super admin thì endpoint trả 403 kèm mã rõ ràng —
 * không dùng dữ liệu mẫu để giả vờ.
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireSuperAdmin(userId: string): Promise<void> {
    const op = await this.prisma.lineageMembership.findFirst({
      where: {
        userId,
        role: LineageRole.SYSTEM_ADMIN,
        status: 'approved',
      },
      select: { id: true },
    });
    if (!op)
      throw new ForbiddenException({
        code: 'NOT_SUPER_ADMIN',
        message:
          'Tài khoản chưa có quyền quản trị nền tảng (cần vai trò SYSTEM_ADMIN)',
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
