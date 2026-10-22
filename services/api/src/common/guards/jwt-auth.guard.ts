import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UserStatus } from '@prisma/client';
import { jwtSecret } from '../../auth/jwt-secret';

/**
 * JwtAuthGuard — xác thực JWT thật.
 *  - đọc header `Authorization: Bearer <access_token>`
 *  - verify chữ ký + hạn bằng JWT_SECRET
 *  - kiểm tra user.status == ACTIVE
 *  - kiểm tra session chưa bị thu hồi / hết hạn
 *  - gắn payload vào request.user = { sub, sessionId, scope }
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwt = new JwtService({ secret: jwtSecret() });

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers?.authorization as string | undefined;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Thiếu hoặc sai định dạng Authorization header',
      });
    }
    let payload: { sub: string; sessionId?: string; scope?: string };
    try {
      payload = await this.jwt.verifyAsync(auth.slice(7));
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Token không hợp lệ hoặc đã hết hạn',
      });
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Tài khoản không còn hiệu lực',
      });
    }
    if (payload.sessionId) {
      const session = await this.prisma.userSession.findUnique({
        where: { id: payload.sessionId },
        select: { revokedAt: true, expiresAt: true },
      });
      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new UnauthorizedException({
          code: 'SESSION_REVOKED',
          message: 'Phiên đăng nhập đã bị thu hồi — vui lòng đăng nhập lại',
        });
      }
    }
    req.user = {
      sub: payload.sub,
      sessionId: payload.sessionId,
      scope: payload.scope ?? 'app',
    };
    return true;
  }
}
