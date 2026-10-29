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
import { ChangeMemberRoleDto } from './dto/change-member-role.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { JoinByCodeDto } from './dto/join-by-code.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
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
  findMine(
    @CurrentUserId() userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.lineages.findMine(
      userId,
      cursor,
      limit ? Number(limit) || 30 : undefined,
    );
  }

  @Get(':lineageId')
  @UseGuards(LineageGuard)
  findOne(@Param('lineageId') lineageId: string) {
    return this.lineages.findOne(lineageId);
  }

  @Patch(':lineageId')
  @UseGuards(LineageGuard)
  update(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateLineageDto,
  ) {
    return this.lineages.update(lineageId, userId, dto);
  }

  @Delete(':lineageId')
  @UseGuards(LineageGuard)
  remove(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.lineages.remove(lineageId, userId);
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
      limit: limit ? Number(limit) || 30 : undefined,
      branch,
    });
  }

  // NOTE: join và join-by-code KHÔNG qua LineageGuard vì user chưa là thành viên.
  @Post(':lineageId/join-requests')
  join(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
    @Body() dto: JoinRequestDto,
  ) {
    return this.lineages.requestJoin(lineageId, userId, dto);
  }

  @Post(':lineageId/join-by-code')
  joinByCode(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
    @Body() dto: JoinByCodeDto,
  ) {
    return this.lineages.joinByCode(lineageId, userId, dto.code);
  }

  @Get(':lineageId/join-requests')
  @UseGuards(LineageGuard)
  listJoinRequests(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.lineages.listJoinRequests(lineageId, userId);
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

  @Patch(':lineageId/members/:userId/role')
  @UseGuards(LineageGuard)
  changeRole(
    @Param('lineageId') lineageId: string,
    @Param('userId') targetUserId: string,
    @CurrentUserId() adminId: string,
    @Body() dto: ChangeMemberRoleDto,
  ) {
    return this.lineages.changeRole(lineageId, adminId, targetUserId, dto.role);
  }

  @Post(':lineageId/transfer-ownership')
  @UseGuards(LineageGuard)
  transferOwnership(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    return this.lineages.transferOwnership(lineageId, userId, dto.userId);
  }

  @Delete(':lineageId/members/:userId')
  @UseGuards(LineageGuard)
  removeMember(
    @Param('lineageId') lineageId: string,
    @Param('userId') targetUserId: string,
    @CurrentUserId() adminId: string,
  ) {
    return this.lineages.removeMember(lineageId, adminId, targetUserId);
  }

  @Post(':lineageId/leave')
  @UseGuards(LineageGuard)
  leave(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.lineages.leave(lineageId, userId);
  }

  @Post(':lineageId/invites')
  @UseGuards(LineageGuard)
  createInvite(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.lineages.createInvite(lineageId, userId, dto);
  }
}
