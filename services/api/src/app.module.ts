import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { LineagesModule } from './lineages/lineages.module';
import { GenealogyModule } from './genealogy/genealogy.module';
import { ChatModule } from './chat/chat.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { PostsModule } from './posts/posts.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { HistoryModule } from './history/history.module';
import { StorageModule } from './storage/storage.module';
import { PushModule } from './push/push.module';

@Module({
  imports: [
    // Giới hạn chung 300 request/phút/IP (kiểm toán L1). Trên serverless mỗi
    // instance đếm riêng nên chỉ là lớp chặn thô; đủ chặt khi API lên VPS.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    AuthModule,
    LineagesModule,
    GenealogyModule,
    ChatModule,
    EventsModule,
    NotificationsModule,
    AdminModule,
    PostsModule,
    ReportsModule,
    AuditModule,
    HistoryModule,
    StorageModule,
    PushModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
