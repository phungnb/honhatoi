import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AdminChangePhoneDto } from './dto/admin-change-phone.dto';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

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

  /** Tra tài khoản theo số ĐT (khớp phần cuối, tối thiểu 6 số). */
  async findUsers(userId: string, phone: string) {
    await this.requireSuperAdmin(userId);
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6)
      throw new BadRequestException({
        code: 'PHONE_QUERY_TOO_SHORT',
        message: 'Nhập ít nhất 6 chữ số cuối của số điện thoại',
      });
    const users = await this.prisma.user.findMany({
      where: { phone: { endsWith: digits.slice(-9) } },
      select: {
        id: true,
        phone: true,
        displayName: true,
        status: true,
        isPlatformAdmin: true,
        createdAt: true,
      },
      take: 20,
    });
    return { data: { users }, error: null };
  }

  /**
   * Đổi số hộ người đã mất số cũ (không nhận được OTP). Quản trị nền tảng
   * phải tự xác minh danh tính ngoài hệ thống; lý do được ghi vào audit.
   * Mọi phiên của tài khoản bị thu hồi.
   */
  async changeUserPhone(
    userId: string,
    targetId: string,
    dto: AdminChangePhoneDto,
  ) {
    await this.requireSuperAdmin(userId);
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, phone: true },
    });
    if (!target)
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Không tìm thấy tài khoản',
      });
    if (target.phone === dto.phone)
      throw new BadRequestException({
        code: 'SAME_PHONE',
        message: 'Số mới trùng với số đang dùng',
      });
    await this.auth.assertPhoneFree(dto.phone);
    await this.auth.changePhone(target.id, target.phone, dto.phone, {
      actorId: userId,
      reason: dto.reason,
    });
    return { data: { id: target.id, phone: dto.phone }, error: null };
  }
}
