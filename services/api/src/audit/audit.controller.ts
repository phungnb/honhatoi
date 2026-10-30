import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LineageGuard } from '../common/guards/lineage.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, LineageGuard)
@Controller('lineages/:lineageId/audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Param('lineageId', ParseUUIDPipe) lineageId: string,
    @Query('before') before?: string,
  ) {
    return this.audit.list(userId, lineageId, before);
  }
}
