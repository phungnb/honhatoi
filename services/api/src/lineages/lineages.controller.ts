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
import { LineagesService } from './lineages.service';
import { CreateLineageDto } from './dto/create-lineage.dto';
import { UpdateLineageDto } from './dto/update-lineage.dto';
import { JoinRequestDto } from './dto/join-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LineageGuard } from '../common/guards/lineage.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('lineages')
export class LineagesController {
  constructor(private readonly lineages: LineagesService) {}

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateLineageDto) {
    return this.lineages.create(userId, dto);
  }

  @Get()
  findMine(@CurrentUserId() userId: string) {
    return this.lineages.findMine(userId);
  }

  @Get(':lineageId')
  @UseGuards(LineageGuard)
  findOne(@Param('lineageId') lineageId: string) {
    return this.lineages.findOne(lineageId);
  }

  @Patch(':lineageId')
  @UseGuards(LineageGuard)
  update(@Param('lineageId') lineageId: string, @Body() dto: UpdateLineageDto) {
    return this.lineages.update(lineageId, dto);
  }

  @Delete(':lineageId')
  @UseGuards(LineageGuard)
  remove(@Param('lineageId') lineageId: string) {
    return this.lineages.remove(lineageId);
  }

  @Get(':lineageId/members')
  @UseGuards(LineageGuard)
  findMembers(
    @Param('lineageId') lineageId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('branch') branch?: string,
  ) {
    return this.lineages.findMembers(lineageId, {
      cursor,
      limit: limit ? Number(limit) : undefined,
      branch,
    });
  }

  @Post(':lineageId/join-requests')
  join(@Param('lineageId') lineageId: string, @CurrentUserId() userId: string, @Body() dto: JoinRequestDto) {
    return this.lineages.requestJoin(lineageId, userId, dto);
  }

  @Post(':lineageId/join-requests/:rid/approve')
  @UseGuards(LineageGuard)
  approve(
    @Param('lineageId') lineageId: string,
    @Param('rid') rid: string,
    @CurrentUserId() reviewerId: string,
    @Body() body: { role?: string },
  ) {
    return this.lineages.reviewJoin(lineageId, rid, reviewerId, true, body.role);
  }

  @Post(':lineageId/join-requests/:rid/reject')
  @UseGuards(LineageGuard)
  reject(
    @Param('lineageId') lineageId: string,
    @Param('rid') rid: string,
    @CurrentUserId() reviewerId: string,
  ) {
    return this.lineages.reviewJoin(lineageId, rid, reviewerId, false);
  }
}
