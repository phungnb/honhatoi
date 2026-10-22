import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Lấy userId từ JWT payload đã được JwtAuthGuard verify (request.user.sub). */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return req.user?.sub;
  },
);
