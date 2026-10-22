import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * JwtAuthGuard (khung).
 * TODO: triển khai xác thực JWT thật —
 *   - đọc header `Authorization: Bearer <access_token>`
 *   - verify bằng @nestjs/jwt với JWT_SECRET (thuật toán RS256 ở production)
 *   - kiểm tra user.status != 'suspended'/'deleted'
 *   - gắn payload đã verify vào request.user = { sub, sessionId, scope }
 * Hiện tại guard này chỉ kiểm tra sự tồn tại của header để khung API chạy được.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers?.authorization as string | undefined;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Thiếu hoặc sai định dạng Authorization header',
      });
    }
    // TODO: thay bằng JwtService.verifyAsync(auth.slice(7))
    req.user = { sub: 'todo-user-id', sessionId: 'todo-session-id', scope: 'app' };
    return true;
  }
}
