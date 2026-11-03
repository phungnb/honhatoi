import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import { HistoryService } from './history.service';
import { CeremonyDto, HistoryEntryDto } from './dto/history.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LineageGuard } from '../common/guards/lineage.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';

class UpdateHistoryEntryDto extends PartialType(HistoryEntryDto) {}
class UpdateCeremonyDto extends PartialType(CeremonyDto) {}

@UseGuards(JwtAuthGuard, LineageGuard)
@Controller('lineages/:lineageId/history')
export class HistoryController {
  constructor(private readonly history: HistoryService) {}

  @Get()
  get(@CurrentUserId() userId: string, @Param('lineageId', ParseUUIDPipe) lineageId: string) {
    return this.history.get(lineageId, userId);
  }

  @Post('entries')
  createEntry(
    @CurrentUserId() userId: string,
    @Param('lineageId', ParseUUIDPipe) lineageId: string,
    @Body() dto: HistoryEntryDto,
  ) {
    return this.history.createEntry(lineageId, userId, dto);
  }

  @Patch('entries/:id')
  updateEntry(
    @CurrentUserId() userId: string,
    @Param('lineageId', ParseUUIDPipe) lineageId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHistoryEntryDto,
  ) {
    return this.history.updateEntry(lineageId, userId, id, dto);
  }

  @Delete('entries/:id')
  deleteEntry(
    @CurrentUserId() userId: string,
    @Param('lineageId', ParseUUIDPipe) lineageId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.history.deleteEntry(lineageId, userId, id);
  }

  @Post('ceremonies')
  createCeremony(
    @CurrentUserId() userId: string,
    @Param('lineageId', ParseUUIDPipe) lineageId: string,
    @Body() dto: CeremonyDto,
  ) {
    return this.history.createCeremony(lineageId, userId, dto);
  }

  @Patch('ceremonies/:id')
  updateCeremony(
    @CurrentUserId() userId: string,
    @Param('lineageId', ParseUUIDPipe) lineageId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCeremonyDto,
  ) {
    return this.history.updateCeremony(lineageId, userId, id, dto);
  }

  @Delete('ceremonies/:id')
  deleteCeremony(
    @CurrentUserId() userId: string,
    @Param('lineageId', ParseUUIDPipe) lineageId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.history.deleteCeremony(lineageId, userId, id);
  }
}
