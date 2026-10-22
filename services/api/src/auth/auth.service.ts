import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

/**
 * AuthService (khung).
 * Luồng OTP theo spec 6.1: mã 6 số, lưu HASH (phone_otp_codes.code_hash),
 * hiệu lực 5 phút, khóa sau 5 lần sai (HNT-T-022).
 */
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /** POST /auth/otp/request — sinh OTP và lưu hash (TODO: gửi SMS qua nhà cung cấp). */
  async requestOtp(dto: RequestOtpDto) {
    // TODO:
    //  1. Rate limit: tối đa 5 lần / 15 phút / số điện thoại (HNT-T-022).
    //  2. Sinh mã 6 số crypto.randomInt, hash bằng argon2, lưu phone_otp_codes.
    //  3. Gửi SMS qua provider; KHÔNG trả mã về response.
    return { data: { sent: true }, error: null };
  }

  /** POST /auth/otp/verify — đổi mã OTP lấy access + refresh token. */
  async verifyOtp(dto: VerifyOtpDto) {
    // TODO:
    //  1. Tìm phone_otp_codes mới nhất còn hạn, chưa consumed; attempts < 5.
    //  2. So mã bằng argon2.verify; sai → attempts++, đúng 5 lần thì khóa.
    //  3. Đánh dấu consumed_at; tìm/tạo users + member_profiles tối thiểu.
    //  4. Tạo access JWT (15 phút) + refresh token (48 byte ngẫu nhiên, lưu HASH
    //     vào user_sessions, xoay vòng mỗi lần dùng — phát hiện tái sử dụng thì
    //     thu hồi toàn bộ phiên).
    throw new UnauthorizedException({
      code: 'NOT_IMPLEMENTED',
      message: 'verifyOtp chưa triển khai — xem TODO trong service',
    });
  }

  /** POST /auth/refresh — xoay vòng refresh token. */
  async refresh(refreshToken: string) {
    // TODO: hash refreshToken, tìm user_sessions còn hạn & chưa revoked;
    // nếu token đã bị thay thế (tái sử dụng) → thu hồi TẤT CẢ phiên của user.
    throw new UnauthorizedException({ code: 'NOT_IMPLEMENTED', message: 'refresh chưa triển khai' });
  }

  /** POST /auth/logout — thu hồi refresh token của phiên hiện tại. */
  async logout(userId: string, sessionId: string) {
    // TODO: đặt user_sessions.revoked_at = now() cho (userId, sessionId).
    return { data: { loggedOut: true }, error: null };
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
