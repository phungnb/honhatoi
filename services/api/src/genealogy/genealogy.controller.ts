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
import { GenealogyService } from './genealogy.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { CreateProposalDto } from './dto/create-proposal.dto';
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
  searchPersons(@Param('lineageId') lineageId: string, @Query('q') q = '') {
    return this.genealogy.searchPersons(lineageId, q);
  }

  @Get('lineages/:lineageId/tree')
  @UseGuards(LineageGuard)
  getTree(
    @Param('lineageId') lineageId: string,
    @Query('root_person_id') rootPersonId?: string,
    @Query('generations') generations?: string,
    @Query('branch') branch?: string,
  ) {
    return this.genealogy.getTree(lineageId, {
      rootPersonId,
      generations: generations ? Number(generations) : undefined,
      branch,
    });
  }

  @Get('persons/:id')
  findPerson(@Param('id') id: string) {
    // TODO: resolve lineageId từ person rồi kiểm tra can_view qua LineageGuard mở rộng.
    return this.genealogy.findPerson(id);
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
  removePerson(@Param('id') id: string) {
    return this.genealogy.removePerson(id);
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
  removeRelationship(@Param('id') id: string) {
    return this.genealogy.removeRelationship(id);
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
  listProposals(@Param('lineageId') lineageId: string, @Query('status') status?: string) {
    return this.genealogy.listProposals(lineageId, status);
  }

  @Post('proposals/:id/approve')
  approveProposal(@Param('id') id: string, @CurrentUserId() reviewerId: string) {
    return this.genealogy.approveProposal(id, reviewerId);
  }

  @Post('proposals/:id/reject')
  rejectProposal(@Param('id') id: string, @CurrentUserId() reviewerId: string) {
    return this.genealogy.rejectProposal(id, reviewerId);
  }

  @Post('proposals/:id/dispute')
  disputeProposal(@Param('id') id: string, @CurrentUserId() reviewerId: string) {
    return this.genealogy.disputeProposal(id, reviewerId);
  }

  @Get('persons/:id/history')
  personHistory(@Param('id') id: string) {
    return this.genealogy.personHistory(id);
  }
}
