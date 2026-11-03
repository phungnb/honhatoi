import {
  Controller,
  Get,
  Headers,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { GenealogyService } from './genealogy.service';

/**
 * Việc chạy theo lịch. Vercel Cron (vercel.json) hoặc cron trên VPS gọi kèm
 * `Authorization: Bearer <CRON_SECRET>`; thiếu biến môi trường thì từ chối.
 */
@Controller('cron')
export class CronController {
  constructor(private readonly genealogy: GenealogyService) {}

  @Get('anniversary-reminders')
  anniversaryReminders(@Headers('authorization') auth?: string) {
    const secret = process.env.CRON_SECRET;
    if (!secret)
      throw new ServiceUnavailableException({
        code: 'CRON_NOT_CONFIGURED',
        message: 'Chưa cấu hình CRON_SECRET',
      });
    const want = Buffer.from(`Bearer ${secret}`);
    const got = Buffer.from(auth ?? '');
    if (got.length !== want.length || !timingSafeEqual(got, want))
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Sai khóa cron',
      });
    return this.genealogy.sendAnniversaryReminders();
  }
}
