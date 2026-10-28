import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notifications.list(userId, {
      unreadOnly: unreadOnly === 'true',
      cursor,
      limit: limit ? Number(limit) || 30 : undefined,
    });
  }

  @Get('unread-count')
  unreadCount(@CurrentUserId() userId: string) {
    return this.notifications.unreadCount(userId);
  }

  @Post('read-all')
  markAllRead(@CurrentUserId() userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @Post(':id/read')
  markRead(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.notifications.markRead(userId, id);
  }

  @Delete(':id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.notifications.remove(userId, id);
  }
}
