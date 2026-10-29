import {
  BadRequestException,
  ConflictException,
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
import { Prisma, UserStatus } from '@prisma/client';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import {
  EmailLoginDto,
  EmailRegisterDto,
  GoogleLoginDto,
  SetPasswordDto,
} from './dto/email-auth.dto';
import {
  ConfirmPhoneChangeDto,
  RequestPhoneChangeDto,
} from './dto/phone-change.dto';
import { jwtSecret } from './jwt-secret';
import { normalizeVnPhone } from '../common/phone';

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
/** Mã OTP đăng nhập — tách khỏi mã đổi số để không dùng lẫn được. */
const LOGIN_PURPOSES = ['register', 'login', 'recover'];
const PHONE_CHANGE_OLD = 'phone_change_old';
const PHONE_CHANGE_NEW = 'phone_change_new';
const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCK_MS = 15 * 60_000;

@Injectable()
export class AuthService {
  private readonly jwt = new JwtService({ secret: jwtSecret() });

  constructor(private readonly prisma: PrismaService) {}

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** POST /auth/otp/request — sinh OTP, lưu hash. SMS do provider gửi (TODO). */
  async requestOtp(dto: RequestOtpDto) {
    await this.issueOtp(dto.phone, dto.purpose);
    return { data: { sent: true }, error: null };
  }

  /** Rate limit theo số ĐT, sinh mã 6 số, chỉ lưu hash. */
  private async issueOtp(phone: string, purpose: string): Promise<void> {
    const since = new Date(Date.now() - OTP_WINDOW_MS);
    const recent = await this.prisma.phoneOtpCode.count({
      where: { phone, createdAt: { gte: since } },
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
        phone,
        codeHash: await argon2.hash(code),
        purpose,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });
    // TODO: gửi SMS qua nhà cung cấp (Viettel/VMG/...). KHÔNG bao giờ trả mã về response.
  }

  /**
   * Kiểm tra mã OTP mới nhất còn hạn của số ĐT (đúng mục đích). Sai thì
   * tăng số lần nhập sai và ném lỗi; đúng thì trả id bản ghi — người gọi
   * tự đánh dấu đã dùng (để đổi số chỉ tiêu mã khi CẢ HAI mã đều đúng).
   */
  private async checkOtp(
    phone: string,
    code: string,
    purposes: string[],
  ): Promise<string> {
    const record = await this.prisma.phoneOtpCode.findFirst({
      where: {
        phone,
        purpose: { in: purposes },
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

    const ok = await argon2.verify(record.codeHash, code);
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
    return record.id;
  }

  /** POST /auth/otp/verify — đổi OTP lấy cặp access + refresh token. */
  async verifyOtp(dto: VerifyOtpDto) {
    // Mã test nội bộ (phương án A, Ba duyệt 24/10): chỉ có tác dụng khi
    // CẢ 2 biến môi trường đều được đặt, và chỉ đúng 1 số điện thoại.
    // Xóa 1 trong 2 biến là đóng lại ngay, không cần sửa code.
    // Đặt trước bước tra mã thật để Ba không cần nhận SMS.
    const testPhone = process.env.TEST_PHONE
      ? normalizeVnPhone(process.env.TEST_PHONE)
      : undefined;
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

    const otpId = await this.checkOtp(dto.phone, dto.code, LOGIN_PURPOSES);
    await this.prisma.phoneOtpCode.update({
      where: { id: otpId },
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
    const {
      passwordHash,
      googleSub,
      failedLoginCount: _f,
      lockedUntil: _l,
      ...safe
    } = user;
    return {
      data: {
        user: {
          ...safe,
          hasPassword: Boolean(passwordHash),
          hasGoogle: Boolean(googleSub),
        },
      },
      error: null,
    };
  }

  /**
   * POST /auth/phone/change/request — gửi mã tới CẢ số cũ lẫn số mới.
   * Đổi số giữ nguyên tài khoản (user id), nên vai trò Trưởng tộc, quyền
   * quản trị nền tảng, dòng họ đã tham gia đều đi theo.
   */
  async requestPhoneChange(userId: string, dto: RequestPhoneChangeDto) {
    const user = await this.activeUser(userId);
    if (user.phone === dto.newPhone)
      throw new BadRequestException({
        code: 'SAME_PHONE',
        message: 'Số mới trùng với số đang dùng',
      });
    await this.assertPhoneFree(dto.newPhone);

    if (user.phone) await this.issueOtp(user.phone, PHONE_CHANGE_OLD);
    await this.issueOtp(dto.newPhone, PHONE_CHANGE_NEW);
    return {
      data: { sent: true, requiresOldCode: Boolean(user.phone) },
      error: null,
    };
  }

  /**
   * POST /auth/phone/change/confirm — cần mã của số cũ (chứng minh vẫn giữ
   * số cũ, chống người cầm máy đang đăng nhập chiếm tài khoản) và mã của
   * số mới. Đổi xong thu hồi mọi phiên khác, giữ phiên hiện tại.
   * Mất số cũ → nhờ quản trị nền tảng đổi hộ (POST /admin/users/:id/phone).
   */
  async confirmPhoneChange(
    userId: string,
    sessionId: string | undefined,
    dto: ConfirmPhoneChangeDto,
  ) {
    const user = await this.activeUser(userId);
    if (user.phone && !dto.oldCode)
      throw new BadRequestException({
        code: 'OLD_CODE_REQUIRED',
        message: 'Cần nhập mã gửi tới số điện thoại cũ',
      });

    const otpIds: string[] = [];
    if (user.phone)
      otpIds.push(
        await this.checkOtp(user.phone, dto.oldCode!, [PHONE_CHANGE_OLD]),
      );
    otpIds.push(
      await this.checkOtp(dto.newPhone, dto.newCode, [PHONE_CHANGE_NEW]),
    );

    await this.changePhone(user.id, user.phone, dto.newPhone, {
      actorId: user.id,
      keepSessionId: sessionId,
      otpIds,
    });
    return { data: { phone: dto.newPhone }, error: null };
  }

  /**
   * Đổi số trong 1 transaction: cập nhật số, tiêu mã OTP, thu hồi phiên,
   * ghi audit. Dùng chung cho tự đổi và quản trị nền tảng đổi hộ.
   */
  async changePhone(
    userId: string,
    oldPhone: string | null,
    newPhone: string,
    opts: {
      actorId: string;
      keepSessionId?: string;
      otpIds?: string[];
      reason?: string;
    },
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { phone: newPhone },
        });
        if (opts.otpIds?.length)
          await tx.phoneOtpCode.updateMany({
            where: { id: { in: opts.otpIds } },
            data: { consumedAt: new Date() },
          });
        await tx.userSession.updateMany({
          where: {
            userId,
            revokedAt: null,
            ...(opts.keepSessionId ? { id: { not: opts.keepSessionId } } : {}),
          },
          data: { revokedAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            actorId: opts.actorId,
            action:
              opts.actorId === userId
                ? 'auth.phone.changed'
                : 'admin.user.phone_changed',
            targetType: 'user',
            targetId: userId,
            metadata: {
              oldPhone,
              newPhone,
              ...(opts.reason ? { reason: opts.reason } : {}),
            },
          },
        });
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw this.phoneTaken();
      throw e;
    }
  }

  async assertPhoneFree(phone: string): Promise<void> {
    const taken = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (taken) throw this.phoneTaken();
  }

  private phoneTaken() {
    return new ConflictException({
      code: 'PHONE_TAKEN',
      message:
        'Số này đã gắn với một tài khoản khác. Liên hệ quản trị nền tảng nếu cần gộp tài khoản.',
    });
  }

  private async activeUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Phiên không hợp lệ',
      });
    return user;
  }

  // ------------------------------------------------------------------
  // EMAIL + MẬT KHẨU, GOOGLE — thêm lựa chọn đăng nhập khi chưa có SMS.
  // Mọi cách đều gắn vào cùng bảng users, nên tài khoản có thể thêm số
  // điện thoại sau (đổi số) mà vẫn giữ vai trò.
  // ------------------------------------------------------------------

  /** POST /auth/email/register — tạo tài khoản bằng email + mật khẩu. */
  async registerEmail(dto: EmailRegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const taken = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (taken) throw this.emailTaken();
    const displayName = dto.displayName.trim();
    let userId: string;
    try {
      userId = await this.prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email,
            passwordHash: await argon2.hash(dto.password),
            displayName,
          },
        });
        await tx.memberProfile.create({
          data: { userId: u.id, fullName: displayName },
        });
        return u.id;
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      )
        throw this.emailTaken();
      throw e;
    }
    return this.issueSession(userId, dto.deviceName, dto.devicePlatform);
  }

  /**
   * POST /auth/email/login. Sai mật khẩu 5 lần liên tiếp → khóa 15 phút
   * (lưu ở DB vì API chạy serverless, bộ nhớ không giữ được giữa các lần
   * gọi). Thông báo lỗi giống nhau cho "không có email" và "sai mật khẩu"
   * để không lộ email nào đã đăng ký.
   */
  async loginEmail(dto: EmailLoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user?.lockedUntil && user.lockedUntil > new Date())
      throw new HttpException(
        {
          code: 'LOGIN_LOCKED',
          message:
            'Nhập sai mật khẩu quá nhiều lần — vui lòng thử lại sau 15 phút',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const ok =
      !!user?.passwordHash &&
      (await argon2.verify(user.passwordHash, dto.password));
    if (!user || !ok) {
      if (user) {
        const fails = user.failedLoginCount + 1;
        await this.prisma.user.update({
          where: { id: user.id },
          data:
            fails >= LOGIN_MAX_FAILS
              ? {
                  failedLoginCount: 0,
                  lockedUntil: new Date(Date.now() + LOGIN_LOCK_MS),
                }
              : { failedLoginCount: fails },
        });
      }
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email hoặc mật khẩu không đúng',
      });
    }
    if (user.status !== UserStatus.ACTIVE)
      throw new ForbiddenException({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Tài khoản đã bị khóa hoặc xóa',
      });
    if (user.failedLoginCount || user.lockedUntil)
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });
    return this.issueSession(user.id, dto.deviceName, dto.devicePlatform);
  }

  /**
   * POST /auth/password — thêm hoặc đổi email + mật khẩu cho tài khoản
   * đang đăng nhập (vd: người dùng bằng số điện thoại muốn thêm cách
   * đăng nhập dự phòng). Đã có mật khẩu thì phải nhập mật khẩu cũ.
   */
  async setPassword(
    userId: string,
    sessionId: string | undefined,
    dto: SetPasswordDto,
  ) {
    const user = await this.activeUser(userId);
    if (user.passwordHash) {
      const ok =
        !!dto.currentPassword &&
        (await argon2.verify(user.passwordHash, dto.currentPassword));
      if (!ok)
        throw new UnauthorizedException({
          code: 'INVALID_CREDENTIALS',
          message: 'Mật khẩu hiện tại không đúng',
        });
    }
    const email = dto.email?.trim().toLowerCase() ?? user.email;
    if (!email)
      throw new BadRequestException({
        code: 'EMAIL_REQUIRED',
        message: 'Cần nhập email để đăng nhập bằng mật khẩu',
      });
    const emailChanged = email !== user.email;
    if (emailChanged) {
      const taken = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (taken) throw this.emailTaken();
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          email,
          passwordHash: await argon2.hash(dto.newPassword),
          ...(emailChanged ? { emailVerifiedAt: null } : {}),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      // Đổi mật khẩu → đăng xuất các thiết bị khác.
      await tx.userSession.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
          ...(sessionId ? { id: { not: sessionId } } : {}),
        },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'auth.password.set',
          targetType: 'user',
          targetId: user.id,
          metadata: { email, emailChanged },
        },
      });
    });
    return { data: { email }, error: null };
  }

  /**
   * POST /auth/google — đổi ID token Google lấy phiên. Token được Google
   * kiểm tra (tokeninfo) và phải đúng GOOGLE_CLIENT_ID của ứng dụng.
   * Tìm theo google_sub; chưa có thì gắn vào tài khoản cùng email; chưa có
   * nữa thì tạo tài khoản mới.
   */
  async loginGoogle(dto: GoogleLoginDto) {
    const clientIds = (process.env.GOOGLE_CLIENT_ID ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!clientIds.length)
      throw new HttpException(
        {
          code: 'GOOGLE_LOGIN_DISABLED',
          message: 'Đăng nhập Google chưa được bật trên máy chủ',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    const claims = await this.verifyGoogleToken(dto.idToken, clientIds);
    const email = claims.email.toLowerCase();

    let user = await this.prisma.user.findUnique({
      where: { googleSub: claims.sub },
    });
    if (!user) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        // Gắn Google vào tài khoản sẵn có. Nếu email đó chưa từng được xác
        // minh (tự khai khi đăng ký mật khẩu), có thể là người khác đăng ký
        // trước bằng email của chủ thật → bỏ mật khẩu cũ, đăng xuất mọi
        // phiên, để chỉ chủ email (đã được Google xác minh) dùng được.
        const unverified = !byEmail.emailVerifiedAt;
        user = await this.prisma.$transaction(async (tx) => {
          const u = await tx.user.update({
            where: { id: byEmail.id },
            data: {
              googleSub: claims.sub,
              emailVerifiedAt: new Date(),
              ...(unverified ? { passwordHash: null } : {}),
            },
          });
          if (unverified)
            await tx.userSession.updateMany({
              where: { userId: u.id, revokedAt: null },
              data: { revokedAt: new Date() },
            });
          await tx.auditLog.create({
            data: {
              actorId: u.id,
              action: 'auth.google.linked',
              targetType: 'user',
              targetId: u.id,
              metadata: { email, resetPassword: unverified },
            },
          });
          return u;
        });
      } else {
        const displayName = (claims.name ?? email.split('@')[0]).slice(0, 100);
        user = await this.prisma.$transaction(async (tx) => {
          const u = await tx.user.create({
            data: {
              email,
              emailVerifiedAt: new Date(),
              googleSub: claims.sub,
              displayName,
              avatarUrl: claims.picture ?? null,
            },
          });
          await tx.memberProfile.create({
            data: { userId: u.id, fullName: displayName },
          });
          return u;
        });
      }
    }
    if (user.status !== UserStatus.ACTIVE)
      throw new ForbiddenException({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Tài khoản đã bị khóa hoặc xóa',
      });
    return this.issueSession(user.id, dto.deviceName, dto.devicePlatform);
  }

  private async verifyGoogleToken(
    idToken: string,
    clientIds: string[],
  ): Promise<{ sub: string; email: string; name?: string; picture?: string }> {
    const invalid = new UnauthorizedException({
      code: 'GOOGLE_TOKEN_INVALID',
      message: 'Không xác thực được tài khoản Google — vui lòng thử lại',
    });
    let claims: Record<string, string | undefined>;
    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      );
      if (!res.ok) throw invalid;
      claims = (await res.json()) as Record<string, string | undefined>;
    } catch {
      throw invalid;
    }
    const issuerOk =
      claims.iss === 'accounts.google.com' ||
      claims.iss === 'https://accounts.google.com';
    if (
      !issuerOk ||
      !claims.aud ||
      !clientIds.includes(claims.aud) ||
      !claims.sub ||
      !claims.email ||
      claims.email_verified !== 'true'
    )
      throw invalid;
    return {
      sub: claims.sub,
      email: claims.email,
      name: claims.name,
      picture: claims.picture,
    };
  }

  private emailTaken() {
    return new ConflictException({
      code: 'EMAIL_TAKEN',
      message:
        'Email này đã có tài khoản. Hãy đăng nhập, hoặc dùng Google nếu email là Gmail.',
    });
  }

  /**
   * Quản trị nền tảng đặt lại mật khẩu hộ (chưa có dịch vụ gửi email).
   * Trả mật khẩu tạm đúng 1 lần để người vận hành chuyển cho người dùng.
   */
  async resetPasswordByAdmin(
    actorId: string,
    targetId: string,
    reason: string,
  ): Promise<string> {
    const temp = randomBytes(6).toString('base64url');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetId },
        data: {
          passwordHash: await argon2.hash(temp),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      await tx.userSession.updateMany({
        where: { userId: targetId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'admin.user.password_reset',
          targetType: 'user',
          targetId,
          metadata: { reason },
        },
      });
    });
    return temp;
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
