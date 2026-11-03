import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import { PushService } from './push.service';

class SubKeysDto {
  @IsString() @MaxLength(200) p256dh: string;
  @IsString() @MaxLength(100) auth: string;
}

class SubscribeDto {
  @IsUrl({ protocols: ['https'], require_tld: true }) @MaxLength(1000) endpoint: string;
  @ValidateNested() @Type(() => SubKeysDto) keys: SubKeysDto;
}

class UnsubscribeDto {
  @IsString() @MaxLength(1000) endpoint: string;
}

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  /** Khóa công khai VAPID để trình duyệt đăng ký; null = máy chủ chưa bật. */
  @Get('config')
  config() {
    return { data: { enabled: this.push.enabled(), publicKey: this.push.publicKey() }, error: null };
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  subscribe(@CurrentUserId() userId: string, @Body() dto: SubscribeDto) {
    return this.push.subscribe(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('unsubscribe')
  unsubscribe(@CurrentUserId() userId: string, @Body() dto: UnsubscribeDto) {
    return this.push.unsubscribe(userId, dto.endpoint);
  }
}
