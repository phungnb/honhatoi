import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateConversationDto) {
    return this.chat.createConversation(userId, dto);
  }

  @Get()
  findMine(@CurrentUserId() userId: string) {
    return this.chat.findMine(userId);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.sendMessage(id, userId, dto);
  }

  @Get(':id/messages')
  findMessages(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.chat.findMessages(id, limit ? Number(limit) : 30);
  }

  @Post(':id/read')
  markRead(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() body: { message_id: string },
  ) {
    return this.chat.markRead(id, userId, body.message_id);
  }
}
