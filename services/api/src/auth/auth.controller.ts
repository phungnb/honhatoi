import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  EmailLoginDto,
  EmailRegisterDto,
  GoogleLoginDto,
  SetPasswordDto,
} from './dto/email-auth.dto';
import {
  ConfirmPhoneChangeDto,
  RequestPhoneChangeDto,
} from './dto/phone-change.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';

// Map với spec 3.2: /auth/otp/request ≈ POST /auth/phone/otp,
// /auth/otp/verify ≈ POST /auth/phone/verify.
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  @HttpCode(200)
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto);
  }

  @Post('otp/verify')
  @HttpCode(200)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  logout(@CurrentUserId() userId: string, @Body() body: { sessionId: string }) {
    return this.auth.logout(userId, body.sessionId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUserId() userId: string) {
    return this.auth.me(userId);
  }

  @Post('phone/change/request')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  requestPhoneChange(
    @CurrentUserId() userId: string,
    @Body() dto: RequestPhoneChangeDto,
  ) {
    return this.auth.requestPhoneChange(userId, dto);
  }

  @Post('phone/change/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  confirmPhoneChange(
    @CurrentUserId() userId: string,
    @Req() req: { user?: { sessionId?: string } },
    @Body() dto: ConfirmPhoneChangeDto,
  ) {
    return this.auth.confirmPhoneChange(userId, req.user?.sessionId, dto);
  }

  @Post('email/register')
  @HttpCode(200)
  registerEmail(@Body() dto: EmailRegisterDto) {
    return this.auth.registerEmail(dto);
  }

  @Post('email/login')
  @HttpCode(200)
  loginEmail(@Body() dto: EmailLoginDto) {
    return this.auth.loginEmail(dto);
  }

  @Post('google')
  @HttpCode(200)
  loginGoogle(@Body() dto: GoogleLoginDto) {
    return this.auth.loginGoogle(dto);
  }

  @Post('password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  setPassword(
    @CurrentUserId() userId: string,
    @Req() req: { user?: { sessionId?: string } },
    @Body() dto: SetPasswordDto,
  ) {
    return this.auth.setPassword(userId, req.user?.sessionId, dto);
  }
}
