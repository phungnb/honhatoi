import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Prisma, VerificationStatus } from '@prisma/client';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { CreateProposalDto } from './dto/create-proposal.dto';

/**
 * GenealogyService — triển khai đầy đủ module Gia phả.
 *
 * Hai trục độc lập (HNT-T-024):
 *  - verification_status (family_persons): draft/pending_verification/verified/disputed
 *  - quyền truy cập (genealogy_permissions): can_view/can_propose/can_edit/can_verify/can_manage
 * Đổi trục này không làm đổi kết quả kiểm tra trục kia.
 *
 * Mọi phương thức đều resolve lineageId từ bản ghi (không tin client),
 * rồi kiểm tra membership + quyền — cô lập dữ liệu giữa các họ (HNT-T-010).
 */

const INVERSE: Record<string, string> = {
  parent: 'child',
  child: 'parent',
  spouse: 'spouse',
  ex_spouse: 'ex_spouse',
  adoptive_parent: 'adoptive_child',
  adoptive_child: 'adoptive_parent',
};
/** Các loại quan hệ mà personId là "bề trên" của relatedPersonId. */
const PARENT_TYPES = ['parent', 'adoptive_parent'];
const SPOUSE_TYPES = ['spouse', 'ex_spouse'];
/** Trường nhạy cảm: chỉ người có canEdit mới thấy đầy đủ. */
const SENSITIVE_FIELDS = ['phone', 'email', 'bloodType'] as const;

interface Perm {
  canView: boolean;
  canPropose: boolean;
  canEdit: boolean;
  canVerify: boolean;
  canManage: boolean;
}

const NO_PERM: Perm = {
  canView: false,
  canPropose: false,
  canEdit: false,
  canVerify: false,
  canManage: false,
};

@Injectable()
export class GenealogyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------------------------------------------------------------- helpers

  /** Lấy hồ sơ person chưa xóa mềm, không thấy → 404. */
  private async getPersonOrThrow(personId: string) {
    const person = await this.prisma.familyPerson.findFirst({
      where: { id: personId, deletedAt: null },
    });
    if (!person)
      throw new NotFoundException({
        code: 'PERSON_NOT_FOUND',
        message: 'Không tìm thấy hồ sơ',
      });
    return person;
  }

  /**
   * Quyền hiệu lực của user trong lineage (HNT-T-024):
   *  1. bản ghi genealogy_permissions theo person (nếu có personId),
   *  2. bản ghi theo lineage (personId null),
   *  3. mặc định theo vai trò membership.
   */
  private async effectivePerm(
    lineageId: string,
    userId: string,
    personId?: string,
  ): Promise<Perm> {
    if (personId) {
      const scoped = await this.prisma.genealogyPermission.findFirst({
        where: { lineageId, userId, personId },
      });
      if (scoped) return this.toPerm(scoped);
    }
    const wide = await this.prisma.genealogyPermission.findFirst({
      where: { lineageId, userId, personId: null },
    });
    if (wide) return this.toPerm(wide);

    const membership = await this.prisma.lineageMembership.findFirst({
      where: { lineageId, userId, status: 'approved' },
      select: { role: true },
    });
    if (!membership)
      throw new ForbiddenException({
        code: 'NOT_LINEAGE_MEMBER',
        message:
          'Bạn không phải thành viên được duyệt của dòng họ này — không thể truy cập dữ liệu của họ khác',
      });
    return this.roleDefaultPerm(membership.role as string);
  }

  private toPerm(row: {
    canView: boolean;
    canPropose: boolean;
    canEdit: boolean;
    canVerify: boolean;
    canManage: boolean;
  }): Perm {
    return {
      canView: row.canView,
      canPropose: row.canPropose,
      canEdit: row.canEdit,
      canVerify: row.canVerify,
      canManage: row.canManage,
    };
  }

  private roleDefaultPerm(role: string): Perm {
    switch (role) {
      case 'SYSTEM_ADMIN':
      case 'SENIOR_ADMIN':
      case 'ADMIN':
        return {
          canView: true,
          canPropose: true,
          canEdit: true,
          canVerify: true,
          canManage: true,
        };
      case 'GENEALOGY_MANAGER':
        return {
          canView: true,
          canPropose: true,
          canEdit: true,
          canVerify: true,
          canManage: false,
        };
      case 'MEMBER':
      case 'APP_MEMBER':
        return {
          canView: true,
          canPropose: true,
          canEdit: false,
          canVerify: false,
          canManage: false,
        };
      default: // GUEST và các giá trị khác: chỉ xem
        return {
          canView: true,
          canPropose: false,
          canEdit: false,
          canVerify: false,
          canManage: false,
        };
    }
  }

  private require(perm: Perm, key: keyof Perm, action: string) {
    if (!perm[key])
      throw new ForbiddenException({
        code: 'REQUIRED_PERMISSION',
        message: `Bạn không có quyền ${action} trong dòng họ này`,
      });
  }

  /** Ẩn trường nhạy cảm với người chỉ có quyền xem. */
  private sanitize<T>(person: T, canEdit: boolean): T {
    if (canEdit || !person) return person;
    const copy: Record<string, unknown> = {
      ...(person as unknown as Record<string, unknown>),
    };
    for (const f of SENSITIVE_FIELDS) delete copy[f];
    return copy as T;
  }

  private async audit(
    tx: {
      auditLog: { create: (args: unknown) => Promise<unknown> };
    },
    lineageId: string,
    actorId: string,
    action: string,
    targetType?: string,
    targetId?: string,
    metadata?: Record<string, unknown>,
  ) {
    await tx.auditLog.create({
      data: {
        lineageId,
        actorId,
        action,
        targetType,
        targetId,
        metadata: (metadata ?? Prisma.DbNull) as Prisma.InputJsonValue,
      },
    });
  }

  /** Chụp nhanh các trường có thể sửa — dùng làm payload.before. */
  private pickBefore(person: Record<string, unknown>) {
    const {
      id,
      lineageId,
      verificationStatus,
      createdBy,
      creator,
      updatedBy,
      updater,
      createdAt,
      updatedAt,
      deletedAt,
      relationshipsAsPerson,
      relationshipsAsRelated,
      accountLink,
      changeRequests,
      permissions,
      foundedLineages,
      ...rest
    } = person;
    return rest;
  }

  /** Chỉ cho phép các trường hợp lệ đi vào create/update person (chống mass-assignment). */
  private toPersonData(after: Record<string, unknown> | undefined) {
    const allowed = [
      'fullName',
      'nickname',
      'avatarUrl',
      'gender',
      'birthYearOnly',
      'hometown',
      'currentPlace',
      'phone',
      'email',
      'occupation',
      'education',
      'bloodType',
      'hobbies',
      'bio',
      'burialPlace',
      'generation',
      'branch',
      'roleInLineage',
    ];
    const data: Record<string, unknown> = {};
    if (!after) return data;
    for (const k of allowed) if (after[k] !== undefined) data[k] = after[k];
    if (after['dateOfBirth']) data['dateOfBirth'] = new Date(after['dateOfBirth'] as string);
    if (after['dateOfDeath']) data['dateOfDeath'] = new Date(after['dateOfDeath'] as string);
    return data;
  }

  // ---------------------------------------------------------------- persons

  /**
   * POST /genealogy/lineages/:lineageId/persons
   * - có canEdit → tạo trực tiếp (verification_status='draft'), 201
   * - chỉ có canPropose → tạo đề xuất create_person, 202
   */
  async createPerson(lineageId: string, userId: string, dto: CreatePersonDto) {
    const perm = await this.effectivePerm(lineageId, userId);
    this.require(perm, 'canPropose', 'thêm thành viên');

    const personData = {
      lineageId,
      createdBy: userId,
      ...this.toPersonData(dto as unknown as Record<string, unknown>),
    };

    if (perm.canEdit) {
      const person = await this.prisma.familyPerson.create({
        data: {
          ...personData,
          verificationStatus: VerificationStatus.DRAFT,
        } as Prisma.FamilyPersonUncheckedCreateInput,
      });
      await this.audit(
        this.prisma,
        lineageId,
        userId,
        'genealogy.person.create',
        'family_person',
        person.id,
        { verificationStatus: 'draft' },
      );
      return { data: { person: this.sanitize(person, true) }, error: null };
    }

    const proposal = await this.prisma.genealogyChangeRequest.create({
      data: {
        lineageId,
        requestedBy: userId,
        requestType: 'create_person',
        status: 'pending',
        payload: { after: personData } as Prisma.InputJsonValue,
      },
    });
    return { data: { change_request: proposal }, error: null };
  }

  /**
   * GET /genealogy/lineages/:lineageId/persons — tìm kiếm (HNT-T-008).
   * Hiện dùng contains không dấu hoa/thường; FTS + pg_trgm bổ sung ở migration.
   */
  async searchPersons(lineageId: string, userId: string, q: string) {
    const perm = await this.effectivePerm(lineageId, userId);
    this.require(perm, 'canView', 'xem gia phả');
    const persons = await this.prisma.familyPerson.findMany({
      where: {
        lineageId,
        deletedAt: null,
        ...(q
          ? { fullName: { contains: q, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { fullName: 'asc' },
      take: 50,
    });
    return {
      data: {
        persons: persons.map((p) => this.sanitize(p, perm.canEdit)),
        next_cursor: null,
      },
      error: null,
    };
  }

  /**
   * GET /genealogy/lineages/:lineageId/tree — tải cây theo số thế hệ (HNT-T-017).
   * BFS từ root (mặc định: người không có bề trên, ưu tiên generation nhỏ nhất),
   * kèm vợ/chồng của các nút đã lấy. has_more=true khi còn thế hệ sâu hơn.
   */
  async getTree(
    lineageId: string,
    userId: string,
    opts: { rootPersonId?: string; generations?: number; branch?: string },
  ) {
    const perm = await this.effectivePerm(lineageId, userId);
    this.require(perm, 'canView', 'xem gia phả');
    const generations = Math.min(Math.max(opts.generations ?? 3, 1), 6);

    const persons = await this.prisma.familyPerson.findMany({
      where: {
        lineageId,
        deletedAt: null,
        ...(opts.branch ? { branch: opts.branch } : {}),
      },
    });
    if (persons.length === 0)
      return {
        data: { root: null, persons: [], relationships: [], has_more: false },
        error: null,
      };
    const byId = new Map(persons.map((p) => [p.id, p]));

    const rels = await this.prisma.familyRelationship.findMany({
      where: { lineageId },
    });

    // Kề: bề trên -> bề dưới (chỉ tính quan hệ còn hiệu lực giữa 2 person tồn tại)
    const childrenOf = new Map<string, Set<string>>();
    const hasParent = new Set<string>();
    for (const r of rels) {
      if (!byId.has(r.personId) || !byId.has(r.relatedPersonId)) continue;
      if (PARENT_TYPES.includes(r.relationshipType)) {
        if (!childrenOf.has(r.personId))
          childrenOf.set(r.personId, new Set());
        childrenOf.get(r.personId)!.add(r.relatedPersonId);
        hasParent.add(r.relatedPersonId);
      }
    }

    let rootId = opts.rootPersonId;
    if (rootId) {
      if (!byId.has(rootId))
        throw new NotFoundException({
          code: 'PERSON_NOT_FOUND',
          message: 'Không tìm thấy người làm gốc cây',
        });
    } else {
      const roots = persons
        .filter((p) => !hasParent.has(p.id))
        .sort((a, b) => (a.generation ?? 999) - (b.generation ?? 999));
      rootId = roots[0]?.id;
      if (!rootId)
        return {
          data: { root: null, persons: [], relationships: [], has_more: false },
          error: null,
        };
    }

    const depth = new Map<string, number>([[rootId, 0]]);
    const queue: string[] = [rootId];
    const included = new Set<string>([rootId]);
    let hasMore = false;
    while (queue.length > 0) {
      const pid = queue.shift()!;
      const d = depth.get(pid)!;
      for (const cid of childrenOf.get(pid) ?? []) {
        if (depth.has(cid)) continue;
        if (d + 1 > generations) {
          hasMore = true;
          continue;
        }
        depth.set(cid, d + 1);
        included.add(cid);
        queue.push(cid);
      }
    }
    // Kèm vợ/chồng của các nút đã lấy (1 bậc, không lan tiếp)
    for (const r of rels) {
      if (!SPOUSE_TYPES.includes(r.relationshipType)) continue;
      if (included.has(r.personId) && byId.has(r.relatedPersonId))
        included.add(r.relatedPersonId);
      else if (included.has(r.relatedPersonId) && byId.has(r.personId))
        included.add(r.personId);
    }

    const personsOut = persons
      .filter((p) => included.has(p.id))
      .map((p) => this.sanitize(p, perm.canEdit));
    const relsOut = rels.filter(
      (r) => included.has(r.personId) && included.has(r.relatedPersonId),
    );
    return {
      data: {
        root: this.sanitize(byId.get(rootId)!, perm.canEdit),
        persons: personsOut,
        relationships: relsOut,
        has_more: hasMore,
      },
      error: null,
    };
  }

  /** GET /genealogy/persons/:id — resolve lineage từ bản ghi rồi kiểm tra quyền. */
  async findPerson(personId: string, userId: string) {
    const person = await this.getPersonOrThrow(personId);
    const perm = await this.effectivePerm(person.lineageId, userId);
    this.require(perm, 'canView', 'xem hồ sơ');
    return {
      data: { person: this.sanitize(person, perm.canEdit) },
      error: null,
    };
  }

  /**
   * PATCH /genealogy/persons/:id
   * - có canEdit → cập nhật trực tiếp
   * - chỉ có canPropose → tạo đề xuất update_person + chuyển person sang pending_verification
   */
  async updatePerson(personId: string, userId: string, dto: UpdatePersonDto) {
    const person = await this.getPersonOrThrow(personId);
    const perm = await this.effectivePerm(person.lineageId, userId);
    this.require(perm, 'canPropose', 'sửa hồ sơ');

    const data = {
      ...this.toPersonData(dto as unknown as Record<string, unknown>),
      updatedBy: userId,
    };

    if (perm.canEdit) {
      const updated = await this.prisma.familyPerson.update({
        where: { id: personId },
        data,
      });
      await this.audit(
        this.prisma,
        person.lineageId,
        userId,
        'genealogy.person.update',
        'family_person',
        personId,
        {},
      );
      return {
        data: { person: this.sanitize(updated, true) },
        error: null,
      };
    }

    const before = this.pickBefore(person as unknown as Record<string, unknown>);
    const proposal = await this.prisma.$transaction(async (tx) => {
      const pr = await tx.genealogyChangeRequest.create({
        data: {
          lineageId: person.lineageId,
          personId,
          requestedBy: userId,
          requestType: 'update_person',
          status: 'pending',
          payload: { before, after: data } as Prisma.InputJsonValue,
        },
      });
      await tx.familyPerson.update({
        where: { id: personId },
        data: { verificationStatus: VerificationStatus.PENDING_VERIFICATION },
      });
      return pr;
    });
    return { data: { change_request: proposal }, error: null };
  }

  /**
   * DELETE /genealogy/persons/:id — xóa mềm + xóa quan hệ liên quan trong
   * cùng transaction; các đề xuất đang chờ của person bị từ chối kèm lý do.
   */
  async removePerson(personId: string, userId: string) {
    const person = await this.getPersonOrThrow(personId);
    const perm = await this.effectivePerm(person.lineageId, userId);
    this.require(perm, 'canEdit', 'xóa hồ sơ');

    await this.prisma.$transaction(async (tx) => {
      await tx.familyRelationship.deleteMany({
        where: {
          lineageId: person.lineageId,
          OR: [{ personId }, { relatedPersonId: personId }],
        },
      });
      await tx.familyPerson.update({
        where: { id: personId },
        data: { deletedAt: new Date() },
      });
      await tx.genealogyChangeRequest.updateMany({
        where: { personId, status: 'pending' },
        data: {
          status: 'rejected',
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      });
      await this.audit(
        tx as never,
        person.lineageId,
        userId,
        'genealogy.person.delete',
        'family_person',
        personId,
        {},
      );
    });
    return { data: { deleted: true }, error: null };
  }

  // ------------------------------------------------------- relationships

  /**
   * POST /genealogy/lineages/:lineageId/relationships
   * Tạo CẢ HAI chiều trong cùng transaction (ví dụ parent + child).
   * Hai person phải cùng lineage — chống trộn dữ liệu giữa các họ.
   */
  async createRelationship(
    lineageId: string,
    userId: string,
    dto: CreateRelationshipDto,
  ) {
    const perm = await this.effectivePerm(lineageId, userId);
    this.require(perm, 'canPropose', 'thêm quan hệ');

    if (dto.personId === dto.relatedPersonId)
      throw new ForbiddenException({
        code: 'INVALID_RELATIONSHIP',
        message: 'Không thể tạo quan hệ với chính mình',
      });
    const inverse = INVERSE[dto.relationshipType];
    if (!inverse)
      throw new BadRequestException({
        code: 'UNKNOWN_RELATIONSHIP_TYPE',
        message: 'Loại quan hệ không hợp lệ',
      });

    const [a, b] = await Promise.all([
      this.getPersonOrThrow(dto.personId),
      this.getPersonOrThrow(dto.relatedPersonId),
    ]);
    if (a.lineageId !== lineageId || b.lineageId !== lineageId)
      throw new ForbiddenException({
        code: 'CROSS_LINEAGE_RELATIONSHIP',
        message: 'Không thể tạo quan hệ giữa hai dòng họ khác nhau',
      });

    const existing = await this.prisma.familyRelationship.findFirst({
      where: {
        lineageId,
        OR: [
          {
            personId: dto.personId,
            relatedPersonId: dto.relatedPersonId,
            relationshipType: dto.relationshipType,
          },
          {
            personId: dto.relatedPersonId,
            relatedPersonId: dto.personId,
            relationshipType: inverse,
          },
        ],
      },
    });
    if (existing)
      throw new ConflictException({
        code: 'RELATIONSHIP_EXISTS',
        message: 'Quan hệ này đã tồn tại',
      });

    const payload = {
      personId: dto.personId,
      relatedPersonId: dto.relatedPersonId,
      relationshipType: dto.relationshipType,
      note: dto.note,
    };

    if (perm.canEdit) {
      const [fwd, rev] = await this.prisma.$transaction([
        this.prisma.familyRelationship.create({
          data: { lineageId, createdBy: userId, ...payload },
        }),
        this.prisma.familyRelationship.create({
          data: {
            lineageId,
            createdBy: userId,
            personId: dto.relatedPersonId,
            relatedPersonId: dto.personId,
            relationshipType: inverse,
            note: dto.note,
          },
        }),
      ]);
      await this.audit(
        this.prisma,
        lineageId,
        userId,
        'genealogy.relationship.create',
        'family_relationship',
        fwd.id,
        { type: dto.relationshipType },
      );
      return { data: { relationships: [fwd, rev] }, error: null };
    }

    const proposal = await this.prisma.genealogyChangeRequest.create({
      data: {
        lineageId,
        requestedBy: userId,
        requestType: 'create_relationship',
        status: 'pending',
        payload: { after: payload } as Prisma.InputJsonValue,
      },
    });
    return { data: { change_request: proposal }, error: null };
  }

  /** DELETE /genealogy/relationships/:id — xóa cả hai chiều trong transaction. */
  async removeRelationship(relationshipId: string, userId: string) {
    const rel = await this.prisma.familyRelationship.findUnique({
      where: { id: relationshipId },
    });
    if (!rel)
      throw new NotFoundException({
        code: 'RELATIONSHIP_NOT_FOUND',
        message: 'Không tìm thấy quan hệ',
      });
    const perm = await this.effectivePerm(rel.lineageId, userId);
    this.require(perm, 'canEdit', 'xóa quan hệ');

    const inverse = INVERSE[rel.relationshipType] ?? rel.relationshipType;
    await this.prisma.$transaction([
      this.prisma.familyRelationship.delete({ where: { id: relationshipId } }),
      this.prisma.familyRelationship.deleteMany({
        where: {
          lineageId: rel.lineageId,
          personId: rel.relatedPersonId,
          relatedPersonId: rel.personId,
          relationshipType: inverse,
        },
      }),
    ]);
    await this.audit(
      this.prisma,
      rel.lineageId,
      userId,
      'genealogy.relationship.delete',
      'family_relationship',
      relationshipId,
      {},
    );
    return { data: { deleted: true }, error: null };
  }

  // ----------------------------------------------------------- proposals

  /**
   * POST /genealogy/lineages/:lineageId/proposals — tạo đề xuất chờ xác minh.
   * Với update_person/delete_person: tự chụp before + chuyển person sang
   * pending_verification trong cùng transaction.
   */
  async createProposal(
    lineageId: string,
    userId: string,
    dto: CreateProposalDto,
  ) {
    const perm = await this.effectivePerm(lineageId, userId);
    this.require(perm, 'canPropose', 'gửi đề xuất');

    let personId = dto.personId;
    if (personId) {
      const p = await this.getPersonOrThrow(personId);
      if (p.lineageId !== lineageId)
        throw new ForbiddenException({
          code: 'CROSS_LINEAGE',
          message: 'Hồ sơ không thuộc dòng họ này',
        });
    }

    let payload: Record<string, unknown> = { ...(dto.payload ?? {}) };
    if (dto.requestType === 'update_person' && personId && !payload['before']) {
      const p = await this.getPersonOrThrow(personId);
      payload = {
        before: this.pickBefore(p as unknown as Record<string, unknown>),
        after: payload['after'] ?? {},
      };
    }

    const proposal = await this.prisma.$transaction(async (tx) => {
      const pr = await tx.genealogyChangeRequest.create({
        data: {
          lineageId,
          personId,
          relationshipId: dto.relationshipId,
          requestedBy: userId,
          requestType: dto.requestType,
          status: 'pending',
          payload: payload as Prisma.InputJsonValue,
          reason: dto.reason,
        },
      });
      if (
        personId &&
        (dto.requestType === 'update_person' ||
          dto.requestType === 'delete_person')
      ) {
        await tx.familyPerson.update({
          where: { id: personId },
          data: {
            verificationStatus: VerificationStatus.PENDING_VERIFICATION,
          },
        });
      }
      return pr;
    });
    return { data: { change_request: proposal }, error: null };
  }

  /** GET /genealogy/lineages/:lineageId/proposals — hàng đợi chờ duyệt (canVerify). */
  async listProposals(lineageId: string, userId: string, status = 'pending') {
    const perm = await this.effectivePerm(lineageId, userId);
    this.require(perm, 'canVerify', 'duyệt đề xuất');
    const proposals = await this.prisma.genealogyChangeRequest.findMany({
      where: { lineageId, status: status || 'pending' },
      include: {
        requester: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });
    return { data: { proposals, next_cursor: null }, error: null };
  }

  private async getPendingProposalOrThrow(proposalId: string) {
    const proposal = await this.prisma.genealogyChangeRequest.findUnique({
      where: { id: proposalId },
    });
    if (!proposal)
      throw new NotFoundException({
        code: 'PROPOSAL_NOT_FOUND',
        message: 'Không tìm thấy đề xuất',
      });
    if (proposal.status !== 'pending')
      throw new ConflictException({
        code: 'PROPOSAL_NOT_PENDING',
        message: 'Đề xuất đã được xử lý trước đó',
      });
    return proposal;
  }

  /**
   * POST /genealogy/proposals/:id/approve — áp dụng payload trong transaction
   * + ghi audit log. Không được tự duyệt đề xuất của chính mình (trừ canManage).
   */
  async approveProposal(
    proposalId: string,
    reviewerId: string,
    note?: string,
  ) {
    const proposal = await this.getPendingProposalOrThrow(proposalId);
    const perm = await this.effectivePerm(proposal.lineageId, reviewerId);
    this.require(perm, 'canVerify', 'duyệt đề xuất');
    if (proposal.requestedBy === reviewerId && !perm.canManage)
      throw new ForbiddenException({
        code: 'SELF_APPROVAL_FORBIDDEN',
        message: 'Không được tự duyệt đề xuất của chính mình',
      });

    const payload = (proposal.payload ?? {}) as Record<string, unknown>;

    const result = await this.prisma.$transaction(async (tx) => {
      let applied: unknown = null;
      switch (proposal.requestType) {
        case 'create_person': {
          const after = (payload['after'] ?? {}) as Record<string, unknown>;
          applied = await tx.familyPerson.create({
            data: {
              lineageId: proposal.lineageId,
              createdBy: proposal.requestedBy,
              verificationStatus: VerificationStatus.VERIFIED,
              ...this.toPersonData(after),
            } as Prisma.FamilyPersonUncheckedCreateInput,
          });
          break;
        }
        case 'update_person': {
          if (!proposal.personId)
            throw new BadRequestException({
              code: 'PROPOSAL_MISSING_PERSON',
              message: 'Đề xuất thiếu hồ sơ cần sửa',
            });
          const after = (payload['after'] ?? {}) as Record<string, unknown>;
          applied = await tx.familyPerson.update({
            where: { id: proposal.personId },
            data: {
              ...this.toPersonData(after),
              verificationStatus: VerificationStatus.VERIFIED,
              updatedBy: reviewerId,
            },
          });
          break;
        }
        case 'delete_person': {
          if (!proposal.personId)
            throw new BadRequestException({
              code: 'PROPOSAL_MISSING_PERSON',
              message: 'Đề xuất thiếu hồ sơ cần xóa',
            });
          await tx.familyRelationship.deleteMany({
            where: {
              lineageId: proposal.lineageId,
              OR: [
                { personId: proposal.personId },
                { relatedPersonId: proposal.personId },
              ],
            },
          });
          applied = await tx.familyPerson.update({
            where: { id: proposal.personId },
            data: { deletedAt: new Date() },
          });
          break;
        }
        case 'create_relationship': {
          const after = (payload['after'] ?? {}) as Record<string, unknown>;
          const personId = after['personId'] as string;
          const relatedPersonId = after['relatedPersonId'] as string;
          const relationshipType = after['relationshipType'] as string;
          const inverse = INVERSE[relationshipType];
          if (!personId || !relatedPersonId || !inverse)
            throw new BadRequestException({
              code: 'PROPOSAL_BAD_PAYLOAD',
              message: 'Dữ liệu quan hệ trong đề xuất không hợp lệ',
            });
          const [a, b] = await Promise.all([
            tx.familyPerson.findFirst({
              where: {
                id: personId,
                lineageId: proposal.lineageId,
                deletedAt: null,
              },
            }),
            tx.familyPerson.findFirst({
              where: {
                id: relatedPersonId,
                lineageId: proposal.lineageId,
                deletedAt: null,
              },
            }),
          ]);
          if (!a || !b)
            throw new NotFoundException({
              code: 'PERSON_NOT_FOUND',
              message: 'Một trong hai hồ sơ không còn tồn tại',
            });
          const mk = (p1: string, p2: string, t: string) =>
            tx.familyRelationship.upsert({
              where: {
                lineageId_personId_relatedPersonId_relationshipType: {
                  lineageId: proposal.lineageId,
                  personId: p1,
                  relatedPersonId: p2,
                  relationshipType: t,
                },
              },
              update: {},
              create: {
                lineageId: proposal.lineageId,
                createdBy: proposal.requestedBy,
                personId: p1,
                relatedPersonId: p2,
                relationshipType: t,
                note: (after['note'] as string) ?? null,
              },
            });
          const fwd = await mk(personId, relatedPersonId, relationshipType);
          const rev = await mk(relatedPersonId, personId, inverse);
          applied = [fwd, rev];
          break;
        }
        case 'delete_relationship': {
          const after = (payload['after'] ?? {}) as Record<string, unknown>;
          if (after['relationshipId']) {
            const rel = await tx.familyRelationship.findUnique({
              where: { id: after['relationshipId'] as string },
            });
            if (rel && rel.lineageId === proposal.lineageId) {
              const inv = INVERSE[rel.relationshipType] ?? rel.relationshipType;
              await tx.familyRelationship.delete({
                where: { id: rel.id },
              });
              await tx.familyRelationship.deleteMany({
                where: {
                  lineageId: proposal.lineageId,
                  personId: rel.relatedPersonId,
                  relatedPersonId: rel.personId,
                  relationshipType: inv,
                },
              });
              applied = { deleted: true };
            }
          } else {
            const t = after['relationshipType'] as string;
            const inv = INVERSE[t] ?? t;
            const del = await tx.familyRelationship.deleteMany({
              where: {
                lineageId: proposal.lineageId,
                OR: [
                  {
                    personId: after['personId'] as string,
                    relatedPersonId: after['relatedPersonId'] as string,
                    relationshipType: t,
                  },
                  {
                    personId: after['relatedPersonId'] as string,
                    relatedPersonId: after['personId'] as string,
                    relationshipType: inv,
                  },
                ],
              },
            });
            applied = { deletedCount: del.count };
          }
          break;
        }
        default:
          throw new BadRequestException({
            code: 'UNKNOWN_REQUEST_TYPE',
            message: `Loại đề xuất không hỗ trợ: ${proposal.requestType}`,
          });
      }

      const updated = await tx.genealogyChangeRequest.update({
        where: { id: proposalId },
        data: {
          status: 'approved',
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNote: note ?? null,
        },
      });
      await this.audit(
        tx as never,
        proposal.lineageId,
        reviewerId,
        'genealogy.change.approve',
        'genealogy_change_request',
        proposalId,
        { requestType: proposal.requestType },
      );
      return { updated, applied };
    });

    // Vòng kín sau khi duyệt: báo cho toàn bộ thành viên của họ.
    // Lỗi gửi thông báo không làm hỏng kết quả duyệt.
    await this.notifyApproval(proposal, reviewerId);

    return {
      data: { change_request: result.updated, applied: result.applied },
      error: null,
    };
  }

  /**
   * Thông báo cho mọi thành viên đã duyệt của dòng họ khi một đề xuất được
   * duyệt (chu trình khép kín Luồng 3 → Luồng 2 → Luồng 3 theo đánh giá
   * chuyên gia 27/10/2026). Người duyệt không tự nhận thông báo này.
   */
  private async notifyApproval(
    proposal: {
      id: string;
      lineageId: string;
      requestType: string;
      personId?: string | null;
      payload?: unknown;
    },
    reviewerId: string,
  ): Promise<void> {
    try {
      const members = await this.prisma.lineageMembership.findMany({
        where: { lineageId: proposal.lineageId, status: 'approved' },
        select: { userId: true },
      });
      const payload = (proposal.payload ?? {}) as Record<string, unknown>;
      const after = (payload['after'] ?? {}) as Record<string, unknown>;
      const before = (payload['before'] ?? {}) as Record<string, unknown>;
      const name =
        (after['fullName'] as string | undefined) ??
        (before['fullName'] as string | undefined) ??
        'một hồ sơ gia phả';
      const typeLabel: Record<string, string> = {
        create_person: 'thêm thành viên',
        update_person: 'cập nhật hồ sơ',
        delete_person: 'xóa thành viên',
        create_relationship: 'thêm quan hệ',
        delete_relationship: 'xóa quan hệ',
      };
      const items = members
        .map((m) => m.userId)
        .filter((id) => id !== reviewerId)
        .map((userId) => ({
          userId,
          type: 'genealogy_approved',
          title: 'Gia phả đã cập nhật',
          body: `Đề xuất ${typeLabel[proposal.requestType] ?? proposal.requestType} cho ${name} đã được duyệt.`,
          data: {
            proposalId: proposal.id,
            lineageId: proposal.lineageId,
            requestType: proposal.requestType,
            personId: proposal.personId ?? null,
          },
          dedupKey: `genealogy-approved:${proposal.id}:user:${userId}`,
        }));
      await this.notifications.notifyMany(items);
    } catch {
      // Bỏ qua lỗi thông báo — kết quả duyệt vẫn giữ nguyên.
    }
  }

  /** POST /genealogy/proposals/:id/reject — từ chối + hoàn trạng thái person. */
  async rejectProposal(
    proposalId: string,
    reviewerId: string,
    note?: string,
  ) {
    const proposal = await this.getPendingProposalOrThrow(proposalId);
    const perm = await this.effectivePerm(proposal.lineageId, reviewerId);
    this.require(perm, 'canVerify', 'duyệt đề xuất');

    const updated = await this.prisma.$transaction(async (tx) => {
      const pr = await tx.genealogyChangeRequest.update({
        where: { id: proposalId },
        data: {
          status: 'rejected',
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNote: note ?? null,
        },
      });
      if (
        proposal.personId &&
        (proposal.requestType === 'update_person' ||
          proposal.requestType === 'delete_person')
      ) {
        const person = await tx.familyPerson.findUnique({
          where: { id: proposal.personId },
        });
        if (
          person &&
          person.verificationStatus === VerificationStatus.PENDING_VERIFICATION
        ) {
          await tx.familyPerson.update({
            where: { id: proposal.personId },
            data: { verificationStatus: VerificationStatus.DRAFT },
          });
        }
      }
      await this.audit(
        tx as never,
        proposal.lineageId,
        reviewerId,
        'genealogy.change.reject',
        'genealogy_change_request',
        proposalId,
        { requestType: proposal.requestType },
      );
      return pr;
    });
    return { data: { change_request: updated }, error: null };
  }

  /**
   * POST /genealogy/proposals/:id/dispute — đánh dấu tranh chấp.
   * Ai có quyền đề xuất cũng có thể nêu tranh chấp (không phá hủy dữ liệu);
   * việc gỡ tranh chấp do người có canVerify xử lý qua approve/reject đề xuất mới.
   */
  async disputeProposal(proposalId: string, userId: string) {
    const proposal = await this.getPendingProposalOrThrow(proposalId);
    const perm = await this.effectivePerm(proposal.lineageId, userId);
    this.require(perm, 'canPropose', 'nêu tranh chấp');

    const updated = await this.prisma.$transaction(async (tx) => {
      const pr = await tx.genealogyChangeRequest.update({
        where: { id: proposalId },
        data: {
          status: 'disputed',
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      });
      if (proposal.personId) {
        await tx.familyPerson.update({
          where: { id: proposal.personId },
          data: { verificationStatus: VerificationStatus.DISPUTED },
        });
      }
      await this.audit(
        tx as never,
        proposal.lineageId,
        userId,
        'genealogy.change.dispute',
        'genealogy_change_request',
        proposalId,
        { requestType: proposal.requestType },
      );
      return pr;
    });
    return { data: { change_request: updated }, error: null };
  }

  /** GET /genealogy/persons/:id/history — lịch sử từ các đề xuất đã duyệt (GP-09). */
  async personHistory(personId: string, userId: string) {
    const person = await this.getPersonOrThrow(personId);
    const perm = await this.effectivePerm(person.lineageId, userId);
    this.require(perm, 'canView', 'xem lịch sử');
    const history = await this.prisma.genealogyChangeRequest.findMany({
      where: { personId, status: 'approved' },
      include: {
        requester: { select: { id: true, displayName: true } },
        reviewer: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return { data: { history, next_cursor: null }, error: null };
  }

  /**
   * GET /genealogy/lineages/:lineageId/export — xuất toàn bộ gia phả
   * của MỘT dòng họ ra file Excel (.xlsx).
   *
   * Cô lập dữ liệu (biên cứng của dự án): chỉ xuất đúng lineage mà
   * user có quyền xem; lineageId lấy từ route và kiểm tra membership
   * phía server, không tin client.
   *
   * 3 sheet: Thành viên, Quan hệ, Sự kiện sắp tới.
   */
  async exportLineage(
    lineageId: string,
    userId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const perm = await this.effectivePerm(lineageId, userId);
    this.require(perm, 'canView', 'xuất gia phả');

    const [lineage, persons, rels, events] = await Promise.all([
      this.prisma.lineage.findUnique({ where: { id: lineageId } }),
      this.prisma.familyPerson.findMany({
        where: { lineageId, deletedAt: null },
        orderBy: [{ generation: 'asc' }, { fullName: 'asc' }],
      }),
      this.prisma.familyRelationship.findMany({ where: { lineageId } }),
      this.prisma.event.findMany({
        where: { lineageId, startAt: { gte: new Date() } },
        orderBy: { startAt: 'asc' },
        take: 200,
      }),
    ]);
    if (!lineage)
      throw new NotFoundException({
        code: 'LINEAGE_NOT_FOUND',
        message: 'Không tìm thấy dòng họ',
      });

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HO-NHA-TOI';
    workbook.created = new Date();

    const fmtDate = (d: Date | null | undefined): string => {
      if (!d) return '';
      const dt = new Date(d);
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${dt.getFullYear()}`;
    };
    const relLabel = (t: string): string => {
      switch (t) {
        case 'parent':
          return 'Cha/mẹ của';
        case 'child':
          return 'Con của';
        case 'spouse':
          return 'Vợ/chồng của';
        case 'adoptive_parent':
          return 'Cha/mẹ nuôi của';
        case 'adoptive_child':
          return 'Con nuôi của';
        case 'ex_spouse':
          return 'Vợ/chồng cũ của';
        default:
          return t;
      }
    };
    const eventLabel = (t: string): string => {
      switch (t) {
        case 'ANCESTRAL_CEREMONY':
        case 'ancestral_ceremony':
          return 'Giỗ tổ';
        case 'DEATH_ANNIVERSARY':
        case 'death_anniversary':
          return 'Ngày giỗ';
        case 'BIRTHDAY':
        case 'birthday':
          return 'Sinh nhật';
        case 'FAMILY_MEETING':
        case 'family_meeting':
          return 'Họp họ';
        case 'GATHERING':
        case 'gathering':
          return 'Gặp mặt';
        default:
          return 'Sự kiện';
      }
    };

    // Sheet 1: Thành viên
    const members = workbook.addWorksheet('Thành viên');
    members.columns = [
      { header: 'Họ tên', key: 'fullName', width: 28 },
      { header: 'Tên gọi', key: 'nickname', width: 16 },
      { header: 'Giới tính', key: 'gender', width: 12 },
      { header: 'Ngày sinh', key: 'dob', width: 14 },
      { header: 'Ngày mất', key: 'dod', width: 14 },
      { header: 'Trạng thái', key: 'status', width: 14 },
      { header: 'Quê quán', key: 'hometown', width: 22 },
      { header: 'Phần mộ', key: 'burialPlace', width: 26 },
      { header: 'Chi', key: 'branch', width: 14 },
      { header: 'Đời', key: 'generation', width: 8 },
      { header: 'Ghi chú', key: 'bio', width: 40 },
    ];
    for (const p of persons) {
      members.addRow({
        fullName: p.fullName,
        nickname: p.nickname ?? '',
        gender:
          p.gender === 'male'
            ? 'Nam'
            : p.gender === 'female'
              ? 'Nữ'
              : '',
        dob: p.birthYearOnly && p.dateOfBirth
          ? `Năm ${new Date(p.dateOfBirth as Date).getFullYear()}`
          : fmtDate(p.dateOfBirth as Date | null),
        dod: fmtDate(p.dateOfDeath as Date | null),
        status: p.dateOfDeath ? 'Đã mất' : 'Đang sống',
        hometown: p.hometown ?? '',
        burialPlace: p.burialPlace ?? '',
        branch: p.branch ?? '',
        generation: p.generation ?? '',
        bio: p.bio ?? '',
      });
    }

    // Sheet 2: Quan hệ
    const byId = new Map(persons.map((p) => [p.id, p.fullName]));
    const relations = workbook.addWorksheet('Quan hệ');
    relations.columns = [
      { header: 'Người', key: 'from', width: 28 },
      { header: 'Quan hệ', key: 'type', width: 18 },
      { header: 'Người liên quan', key: 'to', width: 28 },
    ];
    for (const r of rels) {
      const from = byId.get(r.personId);
      const to = byId.get(r.relatedPersonId);
      if (!from || !to) continue;
      relations.addRow({
        from,
        type: relLabel(r.relationshipType),
        to,
      });
    }

    // Sheet 3: Sự kiện sắp tới
    const upcoming = workbook.addWorksheet('Sự kiện sắp tới');
    upcoming.columns = [
      { header: 'Tiêu đề', key: 'title', width: 32 },
      { header: 'Loại', key: 'type', width: 16 },
      { header: 'Ngày', key: 'date', width: 14 },
      { header: 'Địa điểm', key: 'location', width: 26 },
    ];
    for (const e of events) {
      upcoming.addRow({
        title: e.title,
        type: eventLabel(e.eventType as string),
        date: fmtDate(e.startAt),
        location: e.location ?? '',
      });
    }

    const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
    return { buffer, filename: 'gia-pha.xlsx' };
  }

  /**
   * GET /genealogy/lineages/:lineageId/backup — sao lưu toàn bộ gia phả
   * của MỘT dòng họ ra file JSON (để lưu trữ trọn đời và khôi phục
   * sau này).
   *
   * Cô lập dữ liệu như endpoint export: chỉ sao lưu đúng lineage mà
   * user có quyền xem. Trường nhạy cảm (điện thoại, email, nhóm máu)
   * chỉ xuất khi user có quyền sửa — đúng quy tắc sanitize của API.
   * Chỉ xuất dữ liệu, không kèm mã khôi phục: tính năng nhập lại
   * (restore) sẽ làm ở bước sau với kiểm tra trùng lặp.
   */
  async backupLineage(
    lineageId: string,
    userId: string,
  ): Promise<{ json: string; filename: string }> {
    const perm = await this.effectivePerm(lineageId, userId);
    this.require(perm, 'canView', 'sao lưu gia phả');

    const [lineage, persons, rels, events] = await Promise.all([
      this.prisma.lineage.findUnique({ where: { id: lineageId } }),
      this.prisma.familyPerson.findMany({
        where: { lineageId, deletedAt: null },
        orderBy: [{ generation: 'asc' }, { fullName: 'asc' }],
      }),
      this.prisma.familyRelationship.findMany({ where: { lineageId } }),
      this.prisma.event.findMany({
        where: { lineageId },
        orderBy: { startAt: 'asc' },
      }),
    ]);
    if (!lineage)
      throw new NotFoundException({
        code: 'LINEAGE_NOT_FOUND',
        message: 'Không tìm thấy dòng họ',
      });

    const backup = {
      format: 'ho-nha-toi-backup',
      version: 1,
      lineage: { id: lineage.id, name: lineage.name },
      exportedAt: new Date().toISOString(),
      persons: persons.map((p) => this.sanitize(p, perm.canEdit)),
      relationships: rels,
      events,
    };
    return {
      json: JSON.stringify(backup, null, 2),
      filename: 'gia-pha-backup.json',
    };
  }
}
