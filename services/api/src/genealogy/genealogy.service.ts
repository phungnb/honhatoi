import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { CreateProposalDto } from './dto/create-proposal.dto';

/**
 * GenealogyService (khung).
 * Hai trục độc lập (HNT-T-024):
 *  - verification_status (family_persons): draft/pending_verification/verified/disputed
 *  - quyền truy cập (genealogy_permissions): can_view/can_propose/can_edit/...
 * Đổi trục này không làm đổi kết quả kiểm tra trục kia.
 */
@Injectable()
export class GenealogyService {
  constructor(private readonly prisma: PrismaService) {}

  /** POST /genealogy/lineages/:lineageId/persons */
  async createPerson(lineageId: string, userId: string, dto: CreatePersonDto) {
    // TODO: đọc genealogy_permissions của user trong lineage:
    //  - có can_edit → tạo family_persons (verification_status='draft'), 201
    //  - chỉ có can_propose → tạo genealogy_change_requests (202)
    //  - không có quyền → 403 REQUIRED_PERMISSION
    const { dateOfBirth, dateOfDeath, ...rest } = dto;
    const person = await this.prisma.familyPerson.create({
      data: {
        lineageId,
        createdBy: userId,
        ...rest,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        dateOfDeath: dateOfDeath ? new Date(dateOfDeath) : undefined,
      },
    });
    return { data: { person }, error: null };
  }

  /** GET /genealogy/lineages/:lineageId/persons — tìm kiếm (FTS + trigram, HNT-T-008). */
  async searchPersons(lineageId: string, q: string) {
    // TODO: dùng to_tsvector/pg_trgm qua $queryRaw; giới hạn 50 kết quả;
    // lọc trường nhạy cảm theo quyền can_view của từng hồ sơ.
    const persons = await this.prisma.familyPerson.findMany({
      where: { lineageId, deletedAt: null, fullName: { contains: q, mode: 'insensitive' } },
      take: 50,
    });
    return { data: { persons, next_cursor: null }, error: null };
  }

  /** GET /genealogy/lineages/:lineageId/tree — tải theo nhánh/thế hệ (HNT-T-017). */
  async getTree(lineageId: string, opts: { rootPersonId?: string; generations?: number; branch?: string }) {
    // TODO: chỉ trả N thế hệ quanh root + has_more; client tải thêm khi mở rộng.
    return { data: { root: null, persons: [], relationships: [], has_more: false }, error: null };
  }

  /** GET /genealogy/persons/:id — chi tiết, lọc trường nhạy cảm theo quyền. */
  async findPerson(personId: string) {
    // TODO: resolve lineageId từ bản ghi → kiểm tra can_view (toàn họ hoặc theo person).
    const person = await this.prisma.familyPerson.findFirst({
      where: { id: personId, deletedAt: null },
    });
    if (!person) throw new NotFoundException({ code: 'PERSON_NOT_FOUND', message: 'Không tìm thấy hồ sơ' });
    return { data: { person }, error: null };
  }

  /** PATCH /genealogy/persons/:id */
  async updatePerson(personId: string, userId: string, dto: UpdatePersonDto) {
    // TODO: can_edit → cập nhật trực tiếp (200); can_propose → sinh change_request (202);
    // trường nhạy cảm (ngày sinh/mất, quan hệ) luôn qua duyệt nếu cấu hình yêu cầu.
    const { dateOfBirth, dateOfDeath, ...rest } = dto;
    const person = await this.prisma.familyPerson.update({
      where: { id: personId },
      data: {
        ...rest,
        updatedBy: userId,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        dateOfDeath: dateOfDeath ? new Date(dateOfDeath) : undefined,
      },
    });
    return { data: { person }, error: null };
  }

  /** DELETE /genealogy/persons/:id — xóa mềm; quan hệ liên quan xử lý trong transaction. */
  async removePerson(personId: string) {
    // TODO: transaction — đặt deleted_at cho person + xóa mềm/xử lý relationships liên quan.
    const person = await this.prisma.familyPerson.update({
      where: { id: personId },
      data: { deletedAt: new Date() },
    });
    return { data: { person }, error: null };
  }

  /** POST /genealogy/relationships — tạo quan hệ hai chiều trong cùng transaction. */
  async createRelationship(lineageId: string, userId: string, dto: CreateRelationshipDto) {
    if (dto.personId === dto.relatedPersonId) {
      throw new ForbiddenException({ code: 'INVALID_RELATIONSHIP', message: 'Không thể tạo quan hệ với chính mình' });
    }
    // TODO: transaction — tạo cặp parent<->child / spouse<->spouse...;
    // kiểm tra trùng UNIQUE(lineage_id, person_id, related_person_id, relationship_type).
    const relationship = await this.prisma.familyRelationship.create({
      data: { lineageId, createdBy: userId, ...dto },
    });
    return { data: { relationship }, error: null };
  }

  /** DELETE /genealogy/relationships/:id */
  async removeRelationship(relationshipId: string) {
    // TODO: xóa cả chiều ngược lại trong cùng transaction.
    await this.prisma.familyRelationship.delete({ where: { id: relationshipId } });
    return { data: { deleted: true }, error: null };
  }

  /** POST /genealogy/proposals — tạo đề xuất chờ xác minh (can_propose). */
  async createProposal(lineageId: string, userId: string, dto: CreateProposalDto) {
    const proposal = await this.prisma.genealogyChangeRequest.create({
      data: {
        lineageId,
        requestedBy: userId,
        status: 'pending',
        ...dto,
        payload: dto.payload as Prisma.InputJsonValue,
      },
    });
    // TODO: nếu đề xuất tạo/sửa person → đặt family_persons.verification_status='pending_verification'.
    return { data: { change_request: proposal }, error: null };
  }

  /** GET /genealogy/lineages/:lineageId/proposals — hàng đợi chờ duyệt (can_verify). */
  async listProposals(lineageId: string, status = 'pending') {
    const proposals = await this.prisma.genealogyChangeRequest.findMany({
      where: { lineageId, status },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });
    return { data: { proposals, next_cursor: null }, error: null };
  }

  /** POST /genealogy/proposals/:id/approve — áp dụng payload.after trong transaction + audit log. */
  async approveProposal(proposalId: string, reviewerId: string) {
    // TODO: transaction — đọc payload.after, áp dụng thay đổi, status='approved',
    // reviewed_by/at, audit_logs('genealogy.change.approve').
    const proposal = await this.prisma.genealogyChangeRequest.update({
      where: { id: proposalId },
      data: { status: 'approved', reviewedBy: reviewerId, reviewedAt: new Date() },
    });
    return { data: { change_request: proposal }, error: null };
  }

  /** POST /genealogy/proposals/:id/reject */
  async rejectProposal(proposalId: string, reviewerId: string) {
    const proposal = await this.prisma.genealogyChangeRequest.update({
      where: { id: proposalId },
      data: { status: 'rejected', reviewedBy: reviewerId, reviewedAt: new Date() },
    });
    return { data: { change_request: proposal }, error: null };
  }

  /** POST /genealogy/proposals/:id/dispute — chuyển verification_status thành disputed. */
  async disputeProposal(proposalId: string, reviewerId: string) {
    // TODO: transaction — proposal.status='disputed' + family_persons.verification_status='disputed'.
    const proposal = await this.prisma.genealogyChangeRequest.update({
      where: { id: proposalId },
      data: { status: 'disputed', reviewedBy: reviewerId, reviewedAt: new Date() },
    });
    return { data: { change_request: proposal }, error: null };
  }

  /** GET /genealogy/persons/:id/history — lịch sử từ change_requests.payload. */
  async personHistory(personId: string) {
    const history = await this.prisma.genealogyChangeRequest.findMany({
      where: { personId, status: 'approved' },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return { data: { history, next_cursor: null }, error: null };
  }
}
