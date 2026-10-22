import {
  Body,
  Controller,
  Delete,
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

@UseGuards(JwtAuthGuard)
@Controller()
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post('lineages/:lineageId/events')
  @UseGuards(LineageGuard)
  create(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.events.create(lineageId, userId, dto);
  }

  @Get('lineages/:lineageId/events')
  @UseGuards(LineageGuard)
  findAll(
    @Param('lineageId') lineageId: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.events.findAll(lineageId, {
      type,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('events/:id')
  findOne(@Param('id') id: string) {
    return this.events.findOne(id);
  }

  @Patch('events/:id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.events.update(id, dto);
  }

  @Delete('events/:id')
  remove(@Param('id') id: string) {
    return this.events.remove(id);
  }

  @Post('events/:id/rsvp')
  rsvp(@Param('id') id: string, @CurrentUserId() userId: string, @Body() dto: RsvpDto) {
    return this.events.rsvp(id, userId, dto.rsvpStatus);
  }

  @Get('events/:id/participants')
  findParticipants(@Param('id') id: string) {
    return this.events.findParticipants(id);
  }
}
