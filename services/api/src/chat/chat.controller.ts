import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
import { BlockUserDto, PinMessageDto } from './dto/pin-block.dto';
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

  @Post('lineages/:lineageId/group')
  ensureLineageGroup(
    @CurrentUserId() userId: string,
    @Param('lineageId', ParseUUIDPipe) lineageId: string,
  ) {
    return this.chat.ensureLineageGroup(userId, lineageId);
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
    @Query('q') q?: string,
  ) {
    return this.chat.getMessages(userId, id, {
      cursor,
      q,
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

  @Post('messages/:id/pin')
  pinMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
    @Body() dto: PinMessageDto,
  ) {
    return this.chat.pinMessage(userId, id, dto.pinned);
  }

  @Get('blocks')
  listBlocks(@CurrentUserId() userId: string) {
    return this.chat.listBlocks(userId);
  }

  @Post('blocks')
  block(@CurrentUserId() userId: string, @Body() dto: BlockUserDto) {
    return this.chat.block(userId, dto.userId, dto.reason);
  }

  @Delete('blocks/:userId')
  unblock(
    @Param('userId', ParseUUIDPipe) targetId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.chat.unblock(userId, targetId);
  }
}
