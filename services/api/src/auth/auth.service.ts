import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus } from '@prisma/client';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { jwtSecret } from './jwt-secret';

/**
 * AuthService — triển khai đầy đủ xác thực OTP + phiên JWT.
 *
 * Luồng OTP (spec 6.1, HNT-T-022): mã 6 số, chỉ lưu HASH argon2, hiệu lực
 * 5 phút, khóa sau 5 lần nhập sai, rate limit 5 lần gửi / 15 phút / số ĐT.
 * Refresh token: lưu SHA256 hash, xoay vòng mỗi lần dùng; phát hiện tái sử
 * dụng token cũ → thu hồi toàn bộ phiên của user (chống đánh cắp).
 */
const OTP_TTL_MS = 5 * 60_000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_WINDOW_MS = 15 * 60_000;
const OTP_MAX_PER_WINDOW = 5;
const ACCESS_TTL = '15m';
const ACCESS_TTL_SEC = 15 * 60;
const REFRESH_TTL_MS = 30 * 24 * 3600_000;

@Injectable()
export class AuthService {
  private readonly jwt = new JwtService({ secret: jwtSecret() });

  constructor(private readonly prisma: PrismaService) {}

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** POST /auth/otp/request — sinh OTP, lưu hash. SMS do provider gửi (TODO). */
  async requestOtp(dto: RequestOtpDto) {
    const since = new Date(Date.now() - OTP_WINDOW_MS);
    const recent = await this.prisma.phoneOtpCode.count({
      where: { phone: dto.phone, createdAt: { gte: since } },
    });
    if (recent >= OTP_MAX_PER_WINDOW)
      throw new HttpException(
        {
          code: 'OTP_RATE_LIMITED',
          message: 'Bạn yêu cầu mã quá nhiều lần — vui lòng thử lại sau 15 phút',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );

    const code = String(randomInt(100_000, 1_000_000));
    await this.prisma.phoneOtpCode.create({
      data: {
        phone: dto.phone,
        codeHash: await argon2.hash(code),
        purpose: dto.purpose,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });
    // TODO: gửi SMS qua nhà cung cấp (Viettel/VMG/...). KHÔNG bao giờ trả mã về response.
    return { data: { sent: true }, error: null };
  }

  /** POST /auth/otp/verify — đổi OTP lấy cặp access + refresh token. */
  async verifyOtp(dto: VerifyOtpDto) {
    // Mã test nội bộ (phương án A, Ba duyệt 24/10): chỉ có tác dụng khi
    // CẢ 2 biến môi trường đều được đặt, và chỉ đúng 1 số điện thoại.
    // Xóa 1 trong 2 biến là đóng lại ngay, không cần sửa code.
    // Đặt trước bước tra mã thật để Ba không cần nhận SMS.
    const testPhone = process.env.TEST_PHONE;
    const testCode = process.env.TEST_OTP_CODE;
    if (
      testPhone &&
      testCode &&
      dto.phone === testPhone &&
      dto.code === testCode
    ) {
      return this.loginByPhone(
        dto.phone,
        dto.deviceName,
        dto.devicePlatform,
      );
    }

    const record = await this.prisma.phoneOtpCode.findFirst({
      where: {
        phone: dto.phone,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!record)
      throw new UnauthorizedException({
        code: 'OTP_INVALID_OR_EXPIRED',
        message: 'Mã OTP không đúng hoặc đã hết hạn',
      });
    if (record.attempts >= OTP_MAX_ATTEMPTS)
      throw new UnauthorizedException({
        code: 'OTP_LOCKED',
        message: 'Nhập sai quá 5 lần — hãy yêu cầu mã mới',
      });

    const ok = await argon2.verify(record.codeHash, dto.code);
    if (!ok) {
      await this.prisma.phoneOtpCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException({
        code: 'OTP_INVALID',
        message: 'Mã OTP không đúng',
      });
    }
    await this.prisma.phoneOtpCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });

    return this.loginByPhone(
      dto.phone,
      dto.deviceName,
      dto.devicePlatform,
    );
  }

  /**
   * Tìm user theo số điện thoại (tạo mới nếu chưa có) rồi cấp phiên.
   * Dùng chung cho cả luồng OTP thật và mã test nội bộ.
   */
  private async loginByPhone(
    phone: string,
    deviceName?: string,
    devicePlatform?: string,
  ) {
    let user = await this.prisma.user.findUnique({
      where: { phone },
    });
    if (user) {
      if (user.status !== UserStatus.ACTIVE)
        throw new ForbiddenException({
          code: 'ACCOUNT_SUSPENDED',
          message: 'Tài khoản đã bị khóa hoặc xóa',
        });
    } else {
      // Đăng ký ngầm lần đầu: tạo user + hồ sơ tối thiểu trong transaction.
      user = await this.prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: { phone, displayName: 'Thành viên mới' },
        });
        await tx.memberProfile.create({
          data: { userId: u.id, fullName: 'Thành viên mới' },
        });
        return u;
      });
    }
    return this.issueSession(user.id, deviceName, devicePlatform);
  }

  /** Tạo phiên mới: access JWT (15') + refresh token (30 ngày, lưu hash). */
  private async issueSession(
    userId: string,
    deviceName?: string,
    devicePlatform?: string,
  ) {
    const refreshToken = randomBytes(48).toString('hex');
    const session = await this.prisma.userSession.create({
      data: {
        userId,
        deviceName,
        devicePlatform,
        refreshTokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    const accessToken = await this.jwt.signAsync(
      { sub: userId, sessionId: session.id, scope: 'app' },
      { expiresIn: ACCESS_TTL },
    );
    return {
      data: {
        accessToken,
        refreshToken, // chỉ trả về đúng 1 lần duy nhất
        tokenType: 'Bearer',
        expiresIn: ACCESS_TTL_SEC,
        user: { id: userId },
      },
      error: null,
    };
  }

  /**
   * POST /auth/refresh — xoay vòng refresh token.
   * Token cũ bị thu hồi ngay; nếu ai đó tái sử dụng token đã thu hồi
   * (dấu hiệu đánh cắp) → thu hồi TOÀN BỘ phiên của user.
   */
  async refresh(refreshToken: string) {
    const hash = this.hashRefreshToken(refreshToken);
    const session = await this.prisma.userSession.findUnique({
      where: { refreshTokenHash: hash },
    });
    const valid =
      session && !session.revokedAt && session.expiresAt > new Date();
    if (!valid) {
      if (session?.revokedAt) {
        await this.prisma.userSession.updateMany({
          where: { userId: session.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await this.prisma.auditLog.create({
          data: {
            actorId: session.userId,
            action: 'auth.refresh.reuse_detected',
            targetType: 'user_session',
            targetId: session.id,
          },
        });
      }
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Phiên đăng nhập hết hạn — vui lòng đăng nhập lại',
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.userSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      const newRefresh = randomBytes(48).toString('hex');
      const created = await tx.userSession.create({
        data: {
          userId: session.userId,
          deviceName: session.deviceName,
          devicePlatform: session.devicePlatform,
          refreshTokenHash: this.hashRefreshToken(newRefresh),
          expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        },
      });
      return { created, newRefresh };
    });
    const accessToken = await this.jwt.signAsync(
      {
        sub: session.userId,
        sessionId: result.created.id,
        scope: 'app',
      },
      { expiresIn: ACCESS_TTL },
    );
    return {
      data: {
        accessToken,
        refreshToken: result.newRefresh,
        tokenType: 'Bearer',
        expiresIn: ACCESS_TTL_SEC,
      },
      error: null,
    };
  }

  /** POST /auth/logout — thu hồi refresh token của phiên hiện tại. */
  async logout(userId: string, sessionId: string) {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { data: { loggedOut: true }, error: null };
  }

  /** GET /auth/me — hồ sơ rút gọn của user hiện tại. */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user || user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Phiên không hợp lệ',
      });
    const { passwordHash: _ph, ...safe } = user;
    return { data: { user: safe }, error: null };
  }

  // ------------------------------------------------------------------
  // PASSKEY / FIDO2 (WebAuthn) — HNT-S-006 (bổ sung theo ma trận bảo mật).
  // Khung endpoint dự kiến (triển khai ở giai đoạn tăng cường bảo mật):
  //   POST /auth/passkey/register/options  → tạo challenge + lưu tạm
  //   POST /auth/passkey/register/verify   → verify attestation, lưu credential
  //   POST /auth/passkey/login/options     → tạo assertion challenge
  //   POST /auth/passkey/login/verify      → verify assertion, cấp token
  // Dùng thư viện @simplewebauthn/server; credential lưu ở bảng riêng
  // (webauthn_credentials) gắn với users.id, KHÔNG lưu private key ở client.
  // ------------------------------------------------------------------
}
