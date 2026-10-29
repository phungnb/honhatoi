import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import { AdminChangePhoneDto } from './dto/admin-change-phone.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('lineages')
  listLineages(@CurrentUserId() userId: string) {
    return this.admin.listLineages(userId);
  }

  @Get('users')
  findUsers(
    @CurrentUserId() userId: string,
    @Query('q') q?: string,
    @Query('phone') phone?: string,
  ) {
    return this.admin.findUsers(userId, q ?? phone ?? '');
  }

  @Post('users/:targetId/phone')
  @HttpCode(200)
  changeUserPhone(
    @CurrentUserId() userId: string,
    @Param('targetId') targetId: string,
    @Body() dto: AdminChangePhoneDto,
  ) {
    return this.admin.changeUserPhone(userId, targetId, dto);
  }

  @Post('users/:targetId/password-reset')
  @HttpCode(200)
  resetUserPassword(
    @CurrentUserId() userId: string,
    @Param('targetId') targetId: string,
    @Body() dto: AdminResetPasswordDto,
  ) {
    return this.admin.resetUserPassword(userId, targetId, dto);
  }
}
