import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RsvpDto } from './dto/rsvp.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LineageGuard } from '../common/guards/lineage.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, LineageGuard)
@Controller('lineages/:lineageId/events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Param('lineageId') lineageId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.events.create(userId, lineageId, dto);
  }

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Param('lineageId') lineageId: string,
    @Query('upcomingOnly') upcomingOnly?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.events.list(userId, lineageId, {
      upcomingOnly: upcomingOnly !== 'false',
      cursor,
      limit: limit ? Number(limit) || 30 : undefined,
    });
  }

  @Get(':id')
  detail(
    @CurrentUserId() userId: string,
    @Param('lineageId') lineageId: string,
    @Param('id') id: string,
  ) {
    return this.events.detail(userId, lineageId, id);
  }

  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('lineageId') lineageId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.events.update(userId, lineageId, id, dto);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUserId() userId: string,
    @Param('lineageId') lineageId: string,
    @Param('id') id: string,
  ) {
    return this.events.cancel(userId, lineageId, id);
  }

  @Post(':id/rsvp')
  rsvp(
    @CurrentUserId() userId: string,
    @Param('lineageId') lineageId: string,
    @Param('id') id: string,
    @Body() dto: RsvpDto,
  ) {
    return this.events.rsvp(userId, lineageId, id, {
      status: dto.status,
      guestCount: dto.guestCount,
    });
  }

  @Get(':id/attendees')
  attendees(
    @CurrentUserId() userId: string,
    @Param('lineageId') lineageId: string,
    @Param('id') id: string,
    @Query('status') status?: string,
  ) {
    return this.events.attendees(userId, lineageId, id, status);
  }
}
