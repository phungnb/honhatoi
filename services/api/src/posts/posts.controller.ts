import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreateCommentDto, CreatePostDto, PinPostDto, ReactPostDto } from './dto/post.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LineageGuard } from '../common/guards/lineage.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, LineageGuard)
@Controller('lineages/:lineageId/posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Param('lineageId') lineageId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.posts.create(userId, lineageId, dto);
  }

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Param('lineageId') lineageId: string,
    @Query('category') category?: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.posts.list(userId, lineageId, {
      category,
      before,
      limit: limit ? Number(limit) || 20 : undefined,
    });
  }

  @Delete(':id')
  remove(
    @CurrentUserId() userId: string,
    @Param('lineageId') lineageId: string,
    @Param('id') id: string,
  ) {
    return this.posts.remove(userId, lineageId, id);
  }

  @Post(':id/pin')
  pin(
    @CurrentUserId() userId: string,
    @Param('lineageId') lineageId: string,
    @Param('id') id: string,
    @Body() dto: PinPostDto,
  ) {
    return this.posts.pin(userId, lineageId, id, dto.pinned);
  }

  @Post(':id/reactions')
  react(
    @CurrentUserId() userId: string,
    @Param('lineageId') lineageId: string,
    @Param('id') id: string,
    @Body() dto: ReactPostDto,
  ) {
    return this.posts.react(userId, lineageId, id, dto.emoji);
  }

  @Get(':id/comments')
  comments(
    @CurrentUserId() userId: string,
    @Param('lineageId') lineageId: string,
    @Param('id') id: string,
  ) {
    return this.posts.comments(userId, lineageId, id);
  }

  @Post(':id/comments')
  comment(
    @CurrentUserId() userId: string,
    @Param('lineageId') lineageId: string,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.posts.comment(userId, lineageId, id, dto);
  }

  @Delete(':id/comments/:commentId')
  removeComment(
    @CurrentUserId() userId: string,
    @Param('lineageId') lineageId: string,
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    return this.posts.removeComment(userId, lineageId, id, commentId);
  }
}
