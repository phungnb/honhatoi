import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { GenealogyService } from './genealogy.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { ReviewProposalDto } from './dto/review-proposal.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LineageGuard } from '../common/guards/lineage.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';

// Map với spec 3.4: /change-requests ↔ /genealogy/proposals,
// /lineages/:id/persons ↔ /genealogy/lineages/:lineageId/persons.
@UseGuards(JwtAuthGuard)
@Controller('genealogy')
export class GenealogyController {
  constructor(private readonly genealogy: GenealogyService) {}

  @Post('lineages/:lineageId/persons')
  @UseGuards(LineageGuard)
  createPerson(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreatePersonDto,
  ) {
    return this.genealogy.createPerson(lineageId, userId, dto);
  }

  @Get('lineages/:lineageId/persons')
  @UseGuards(LineageGuard)
  searchPersons(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
    @Query('q') q = '',
  ) {
    return this.genealogy.searchPersons(lineageId, userId, q);
  }

  @Get('lineages/:lineageId/tree')
  @UseGuards(LineageGuard)
  getTree(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
    @Query('root_person_id') rootPersonId?: string,
    @Query('generations') generations?: string,
    @Query('branch') branch?: string,
  ) {
    return this.genealogy.getTree(lineageId, userId, {
      rootPersonId,
      generations: generations ? Number(generations) || 3 : undefined,
      branch,
    });
  }

  /// GET /genealogy/lineages/:lineageId/export — tải file Excel gia phả.
  @Get('lineages/:lineageId/export')
  @UseGuards(LineageGuard)
  async exportLineage(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.genealogy.exportLineage(
      lineageId,
      userId,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(buffer);
  }

  /// GET /genealogy/lineages/:lineageId/backup — tải file JSON sao lưu.
  @Get('lineages/:lineageId/backup')
  @UseGuards(LineageGuard)
  async backupLineage(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
    @Res() res: Response,
  ) {
    const { json, filename } = await this.genealogy.backupLineage(
      lineageId,
      userId,
    );
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(json);
  }

  @Get('persons/:id')
  findPerson(@Param('id') id: string, @CurrentUserId() userId: string) {
    // LineageGuard không áp dụng ở đây (không có :lineageId);
    // service tự resolve lineage từ bản ghi và kiểm tra membership + canView.
    return this.genealogy.findPerson(id, userId);
  }

  @Patch('persons/:id')
  updatePerson(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdatePersonDto,
  ) {
    return this.genealogy.updatePerson(id, userId, dto);
  }

  @Delete('persons/:id')
  removePerson(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.genealogy.removePerson(id, userId);
  }

  @Post('lineages/:lineageId/relationships')
  @UseGuards(LineageGuard)
  createRelationship(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateRelationshipDto,
  ) {
    return this.genealogy.createRelationship(lineageId, userId, dto);
  }

  @Delete('relationships/:id')
  removeRelationship(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.genealogy.removeRelationship(id, userId);
  }

  @Post('lineages/:lineageId/proposals')
  @UseGuards(LineageGuard)
  createProposal(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateProposalDto,
  ) {
    return this.genealogy.createProposal(lineageId, userId, dto);
  }

  @Get('lineages/:lineageId/proposals')
  @UseGuards(LineageGuard)
  listProposals(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
    @Query('status') status?: string,
  ) {
    return this.genealogy.listProposals(lineageId, userId, status);
  }

  @Get('lineages/:lineageId/kinship')
  @UseGuards(LineageGuard)
  kinship(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!from || !to)
      throw new BadRequestException({
        code: 'MISSING_QUERY',
        message: 'Cần đủ tham số from và to (id của hai người cần xem vai vế)',
      });
    return this.genealogy.kinship(lineageId, userId, from, to);
  }

  /// GET /genealogy/lunar/convert?date=YYYY-MM-DD — đổi dương sang âm
  /// lịch Việt Nam (phổ quát, không gắn dòng họ, chỉ cần đăng nhập).
  @Get('lunar/convert')
  convertLunar(@Query('date') date?: string) {
    if (!date)
      throw new BadRequestException({
        code: 'MISSING_QUERY',
        message: 'Cần tham số date dạng YYYY-MM-DD',
      });
    return this.genealogy.convertSolarToLunar(date);
  }

  /// GET /genealogy/lineages/:lineageId/anniversaries — ngày giỗ sắp tới
  /// của dòng họ (tuần 3 theo đánh giá chuyên gia). ?limit (mặc định 20,
  /// tối đa 100), ?days (chỉ lấy giỗ trong N ngày tới).
  @Get('lineages/:lineageId/anniversaries')
  @UseGuards(LineageGuard)
  anniversaries(
    @Param('lineageId') lineageId: string,
    @CurrentUserId() userId: string,
    @Query('limit') limit?: string,
    @Query('days') days?: string,
  ) {
    const n = Math.min(Math.max(parseInt(limit ?? '20', 10) || 20, 1), 100);
    const d = days === undefined ? undefined : parseInt(days, 10);
    return this.genealogy.anniversaries(
      lineageId,
      userId,
      n,
      Number.isFinite(d) ? d : undefined,
    );
  }

  @Post('proposals/:id/approve')
  approveProposal(
    @Param('id') id: string,
    @CurrentUserId() reviewerId: string,
    @Body() dto: ReviewProposalDto,
  ) {
    return this.genealogy.approveProposal(id, reviewerId, dto?.note);
  }

  @Post('proposals/:id/reject')
  rejectProposal(
    @Param('id') id: string,
    @CurrentUserId() reviewerId: string,
    @Body() dto: ReviewProposalDto,
  ) {
    return this.genealogy.rejectProposal(id, reviewerId, dto?.note);
  }

  @Post('proposals/:id/dispute')
  disputeProposal(@Param('id') id: string, @CurrentUserId() reviewerId: string) {
    return this.genealogy.disputeProposal(id, reviewerId);
  }

  @Get('persons/:id/history')
  personHistory(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.genealogy.personHistory(id, userId);
  }

  @Post('persons/:id/claim')
  claimPerson(@Param('id', ParseUUIDPipe) id: string, @CurrentUserId() userId: string) {
    return this.genealogy.claimPerson(id, userId);
  }

  @Delete('persons/:id/claim')
  unclaimPerson(@Param('id', ParseUUIDPipe) id: string, @CurrentUserId() userId: string) {
    return this.genealogy.unclaimPerson(id, userId);
  }

  @UseGuards(LineageGuard)
  @Get('lineages/:lineageId/claims')
  listClaims(@Param('lineageId', ParseUUIDPipe) lineageId: string, @CurrentUserId() userId: string) {
    return this.genealogy.listClaims(lineageId, userId);
  }

  @UseGuards(LineageGuard)
  @Get('lineages/:lineageId/me')
  myPerson(@Param('lineageId', ParseUUIDPipe) lineageId: string, @CurrentUserId() userId: string) {
    return this.genealogy.myPerson(lineageId, userId);
  }

  @Post('claims/:id/approve')
  @HttpCode(200)
  approveClaim(@Param('id', ParseUUIDPipe) id: string, @CurrentUserId() userId: string) {
    return this.genealogy.reviewClaim(id, userId, true);
  }

  @Post('claims/:id/reject')
  @HttpCode(200)
  rejectClaim(@Param('id', ParseUUIDPipe) id: string, @CurrentUserId() userId: string) {
    return this.genealogy.reviewClaim(id, userId, false);
  }
}
