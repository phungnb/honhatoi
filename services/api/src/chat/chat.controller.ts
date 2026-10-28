import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post('conversations')
  createConversation(
    @CurrentUserId() userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chat.createConversation(userId, dto);
  }

  @Get('conversations')
  listConversations(
    @CurrentUserId() userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chat.listConversations(userId, {
      cursor,
      limit: limit ? Number(limit) || 20 : undefined,
    });
  }

  @Get('conversations/:id/messages')
  getMessages(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chat.getMessages(userId, id, {
      cursor,
      limit: limit ? Number(limit) || 30 : undefined,
    });
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.sendMessage(id, userId, dto);
  }

  @Patch('messages/:id')
  editMessage(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.chat.editMessage(userId, id, dto.content);
  }

  @Post('messages/:id/recall')
  recallMessage(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.chat.recallMessage(userId, id);
  }

  @Post('messages/:id/reactions')
  toggleReaction(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: ToggleReactionDto,
  ) {
    return this.chat.toggleReaction(userId, id, dto.emoji);
  }

  @Post('conversations/:id/read')
  markRead(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: MarkReadDto,
  ) {
    return this.chat.markRead(userId, id, dto.messageId);
  }

  @Post('conversations/:id/members')
  addMembers(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: AddMembersDto,
  ) {
    return this.chat.addMembers(userId, id, dto.userIds);
  }

  @Delete('conversations/:id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.chat.removeMember(userId, id, targetUserId);
  }

  @Post('conversations/:id/leave')
  leaveConversation(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.chat.leaveConversation(userId, id);
  }
}
