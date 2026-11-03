import { Module } from '@nestjs/common';
import { GenealogyController } from './genealogy.controller';
import { GenealogyService } from './genealogy.service';
import { DemoController } from './demo.controller';
import { CronController } from './cron.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [GenealogyController, DemoController, CronController],
  providers: [GenealogyService],
  exports: [GenealogyService],
})
export class GenealogyModule {}
