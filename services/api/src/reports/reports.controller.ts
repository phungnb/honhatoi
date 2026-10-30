import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto, HandleReportDto } from './dto/report.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LineageGuard } from '../common/guards/lineage.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post('reports')
  create(@CurrentUserId() userId: string, @Body() dto: CreateReportDto) {
    return this.reports.create(userId, dto);
  }

  @UseGuards(LineageGuard)
  @Get('lineages/:lineageId/reports')
  list(
    @CurrentUserId() userId: string,
    @Param('lineageId', ParseUUIDPipe) lineageId: string,
    @Query('status') status?: string,
  ) {
    return this.reports.listForLineage(userId, lineageId, status);
  }

  @UseGuards(LineageGuard)
  @Post('lineages/:lineageId/reports/:id')
  @HttpCode(200)
  handle(
    @CurrentUserId() userId: string,
    @Param('lineageId', ParseUUIDPipe) lineageId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HandleReportDto,
  ) {
    return this.reports.handle(userId, lineageId, id, dto.action);
  }
}
