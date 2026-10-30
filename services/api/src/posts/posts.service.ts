import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto, CreatePostDto } from './dto/post.dto';

const CATEGORY_LABELS: Record<string, string> = {
  thong_bao: 'Thông báo',
  hoat_dong: 'Hoạt động',
  tu_lieu: 'Tư liệu',
  ky_niem: 'Kỷ niệm',
  tim_nguoi_than: 'Tìm người thân',
};

/** Tối đa số bài một người đăng trong 10 phút (chống spam, đặc tả 7.1). */
const POSTS_PER_10_MIN = 10;
const COMMENTS_PER_10_MIN = 40;

/**
 * PostsService — bảng tin dòng họ (đặc tả 3.6): nơi lưu nội dung lâu dài,
 * tách khỏi phòng chat. Mọi thao tác chỉ dành cho thành viên đã duyệt của
 * đúng dòng họ; bài và bình luận luôn được tra theo lineageId trong path
 * (chống đọc chéo họ).
 */
@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async member(lineageId: string, userId: string) {
    const m = await this.prisma.lineageMembership.findFirst({
      where: { lineageId, userId, status: 'approved' },
      include: { lineage: { select: { ownerUserId: true, name: true } } },
    });
    if (!m)
      throw new ForbiddenException({
        code: 'NOT_LINEAGE_MEMBER',
        message: 'Bạn không phải thành viên được duyệt của dòng họ này',
      });
    const isAdmin = m.role === 'ADMIN' || m.lineage.ownerUserId === userId;
    return { m, isAdmin, lineageName: m.lineage.name };
  }

  private async postOrThrow(lineageId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, lineageId, status: 'published' },
    });
    if (!post)
      throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Không tìm thấy bài viết' });
    return post;
  }

  private async rateLimit(kind: 'post' | 'comment', userId: string) {
    const since = new Date(Date.now() - 10 * 60 * 1000);
    const n =
      kind === 'post'
        ? await this.prisma.post.count({ where: { authorId: userId, createdAt: { gte: since } } })
        : await this.prisma.comment.count({ where: { authorId: userId, createdAt: { gte: since } } });
    if (n >= (kind === 'post' ? POSTS_PER_10_MIN : COMMENTS_PER_10_MIN))
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Bạn gửi nhanh quá, vui lòng đợi vài phút rồi thử lại' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
  }

  async create(userId: string, lineageId: string, dto: CreatePostDto) {
    const { isAdmin, lineageName } = await this.member(lineageId, userId);
    if (dto.category === 'thong_bao' && !isAdmin)
      throw new ForbiddenException({
        code: 'ANNOUNCEMENT_ADMIN_ONLY',
        message: 'Chỉ Ban quản trị dòng họ được đăng thông báo',
      });
    const content = dto.content.trim();
    if (!content)
      throw new BadRequestException({ code: 'EMPTY_POST', message: 'Bài viết chưa có nội dung' });
    await this.rateLimit('post', userId);
    const author = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true },
    });
    const post = await this.prisma.post.create({
      data: {
        lineageId,
        authorId: userId,
        authorNameSnapshot: author?.displayName ?? null,
        title: dto.title?.trim() || null,
        content,
        category: dto.category,
      },
    });

    // Thông báo của Ban quản trị gửi tới cả họ; bài thường không làm phiền ai.
    if (dto.category === 'thong_bao') {
      const members = await this.prisma.lineageMembership.findMany({
        where: { lineageId, status: 'approved', userId: { not: userId } },
        select: { userId: true },
      });
      await this.notifications.notifyMany(
        members.map((x) => ({
          userId: x.userId,
          type: 'post_announcement',
          title: `Thông báo của ${lineageName}: ${post.title ?? content.slice(0, 60)}`,
          body: content.slice(0, 160),
          data: { lineageId, postId: post.id },
          dedupKey: `post_announcement:${post.id}:user:${x.userId}`,
        })),
      );
    }
    return { data: { post: await this.view(post.id, userId) }, error: null };
  }

  /** Bài đã ghim trước, sau đó mới nhất trước; phân trang theo thời gian tạo. */
  async list(
    userId: string,
    lineageId: string,
    opts: { category?: string; before?: string; limit?: number },
  ) {
    await this.member(lineageId, userId);
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
    const before = opts.before ? new Date(opts.before) : undefined;
    const where = {
      lineageId,
      status: 'published',
      ...(opts.category && CATEGORY_LABELS[opts.category] ? { category: opts.category } : {}),
    };
    const pinned = before
      ? []
      : await this.prisma.post.findMany({
          where: { ...where, isPinned: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true },
        });
    const rest = await this.prisma.post.findMany({
      where: {
        ...where,
        isPinned: false,
        ...(before && !Number.isNaN(before.getTime()) ? { createdAt: { lt: before } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      select: { id: true, createdAt: true },
    });
    const hasMore = rest.length > limit;
    const page = rest.slice(0, limit);
    const ids = [...pinned.map((p) => p.id), ...page.map((p) => p.id)];
    const posts = await this.views(ids, userId);
    return {
      data: {
        posts,
        nextBefore: hasMore ? page[page.length - 1].createdAt.toISOString() : null,
      },
      error: null,
    };
  }

  private async view(id: string, userId: string) {
    const [p] = await this.views([id], userId);
    return p;
  }

  private async views(ids: string[], userId: string) {
    if (!ids.length) return [];
    const rows = await this.prisma.post.findMany({
      where: { id: { in: ids } },
      include: {
        author: { select: { id: true, displayName: true } },
        reactions: { select: { emoji: true, userId: true } },
        _count: { select: { comments: { where: { status: 'published' } } } },
      },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids
      .map((id) => byId.get(id))
      .filter((r): r is NonNullable<typeof r> => !!r)
      .map((r) => {
        const counts: Record<string, number> = {};
        for (const x of r.reactions) counts[x.emoji] = (counts[x.emoji] ?? 0) + 1;
        return {
          id: r.id,
          title: r.title,
          content: r.content,
          category: r.category,
          isPinned: r.isPinned,
          createdAt: r.createdAt,
          author: {
            id: r.author?.id ?? null,
            name: r.author?.displayName ?? r.authorNameSnapshot ?? 'Người dùng đã xóa',
          },
          isMine: r.authorId === userId,
          reactions: counts,
          myReactions: r.reactions.filter((x) => x.userId === userId).map((x) => x.emoji),
          commentCount: r._count.comments,
        };
      });
  }

  async remove(userId: string, lineageId: string, postId: string) {
    const { isAdmin } = await this.member(lineageId, userId);
    const post = await this.postOrThrow(lineageId, postId);
    if (post.authorId !== userId && !isAdmin)
      throw new ForbiddenException({
        code: 'POST_FORBIDDEN',
        message: 'Chỉ người đăng hoặc Ban quản trị được xóa bài',
      });
    await this.prisma.post.update({ where: { id: post.id }, data: { status: 'removed' } });
    await this.prisma.auditLog
      .create({
        data: {
          lineageId,
          actorId: userId,
          action: 'post.remove',
          targetType: 'post',
          targetId: post.id,
        },
      })
      .catch(() => undefined);
    return { data: { removed: true }, error: null };
  }

  async pin(userId: string, lineageId: string, postId: string, pinned: boolean) {
    const { isAdmin } = await this.member(lineageId, userId);
    if (!isAdmin)
      throw new ForbiddenException({ code: 'PIN_ADMIN_ONLY', message: 'Chỉ Ban quản trị được ghim bài' });
    const post = await this.postOrThrow(lineageId, postId);
    await this.prisma.post.update({ where: { id: post.id }, data: { isPinned: pinned } });
    return { data: { post: await this.view(post.id, userId) }, error: null };
  }

  /** Bấm lần nữa vào cùng cảm xúc thì bỏ. */
  async react(userId: string, lineageId: string, postId: string, emoji: string) {
    await this.member(lineageId, userId);
    const post = await this.postOrThrow(lineageId, postId);
    const key = { postId_userId_emoji: { postId: post.id, userId, emoji } };
    const existing = await this.prisma.postReaction.findUnique({ where: key });
    if (existing) await this.prisma.postReaction.delete({ where: key });
    else await this.prisma.postReaction.create({ data: { postId: post.id, userId, emoji } });
    return { data: { post: await this.view(post.id, userId) }, error: null };
  }

  async comments(userId: string, lineageId: string, postId: string) {
    const { isAdmin } = await this.member(lineageId, userId);
    const post = await this.postOrThrow(lineageId, postId);
    const rows = await this.prisma.comment.findMany({
      where: { postId: post.id, status: 'published' },
      orderBy: { createdAt: 'asc' },
      take: 500,
      include: { author: { select: { id: true, displayName: true } } },
    });
    return {
      data: {
        comments: rows.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          author: { id: c.author?.id ?? null, name: c.author?.displayName ?? 'Người dùng đã xóa' },
          isMine: c.authorId === userId,
          canDelete: c.authorId === userId || isAdmin,
        })),
      },
      error: null,
    };
  }

  async comment(userId: string, lineageId: string, postId: string, dto: CreateCommentDto) {
    await this.member(lineageId, userId);
    const post = await this.postOrThrow(lineageId, postId);
    const content = dto.content.trim();
    if (!content)
      throw new BadRequestException({ code: 'EMPTY_COMMENT', message: 'Bình luận chưa có nội dung' });
    await this.rateLimit('comment', userId);
    const c = await this.prisma.comment.create({
      data: { postId: post.id, authorId: userId, content },
      include: { author: { select: { displayName: true } } },
    });
    if (post.authorId && post.authorId !== userId) {
      await this.notifications.notify(post.authorId, {
        type: 'post_comment',
        title: `${c.author?.displayName ?? 'Một người'} bình luận bài của bạn`,
        body: content.slice(0, 160),
        data: { lineageId, postId: post.id },
        dedupKey: `post_comment:${c.id}`,
      });
    }
    return { data: { comment: { id: c.id } }, error: null };
  }

  async removeComment(userId: string, lineageId: string, postId: string, commentId: string) {
    const { isAdmin } = await this.member(lineageId, userId);
    const post = await this.postOrThrow(lineageId, postId);
    const c = await this.prisma.comment.findFirst({
      where: { id: commentId, postId: post.id, status: 'published' },
    });
    if (!c)
      throw new NotFoundException({ code: 'COMMENT_NOT_FOUND', message: 'Không tìm thấy bình luận' });
    if (c.authorId !== userId && !isAdmin)
      throw new ForbiddenException({
        code: 'COMMENT_FORBIDDEN',
        message: 'Chỉ người viết hoặc Ban quản trị được xóa bình luận',
      });
    await this.prisma.comment.update({ where: { id: c.id }, data: { status: 'removed' } });
    return { data: { removed: true }, error: null };
  }
}
