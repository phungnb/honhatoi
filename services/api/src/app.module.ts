import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { LineagesModule } from './lineages/lineages.module';
import { GenealogyModule } from './genealogy/genealogy.module';
import { ChatModule } from './chat/chat.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    LineagesModule,
    GenealogyModule,
    ChatModule,
    EventsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
