import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import { LineageRole } from '@prisma/client';
import { can } from '../src/common/permissions';
import { LineageGuard } from '../src/common/guards/lineage.guard';

test('ma trận quyền theo vai trò', () => {
  const member = { role: LineageRole.MEMBER, isOwner: false };
  const editor = { role: LineageRole.EDITOR, isOwner: false };
  const admin = { role: LineageRole.ADMIN, isOwner: false };
  const owner = { role: LineageRole.ADMIN, isOwner: true };
  assert.equal(can(member, 'genealogy.view'), true);
  assert.equal(can(member, 'genealogy.edit'), false);
  assert.equal(can(member, 'genealogy.viewSensitive'), false);
  assert.equal(can(member, 'genealogy.export'), false);
  assert.equal(can(editor, 'genealogy.edit'), true);
  assert.equal(can(editor, 'members.manage'), false);
  assert.equal(can(admin, 'members.manage'), true);
  assert.equal(can(admin, 'owner'), false);
  assert.equal(can(owner, 'owner'), true);
});

/** Prisma giả: chỉ user 'u1' là thành viên đã duyệt của họ 'A'. */
const fakePrisma = {
  lineageMembership: {
    findFirst: async ({ where }: { where: { lineageId: string; userId: string; status: string } }) =>
      where.lineageId === 'A' && where.userId === 'u1' && where.status === 'approved'
        ? { id: 'm1', role: 'MEMBER', status: 'approved' }
        : null,
  },
};
const ctx = (req: Record<string, unknown>) =>
  ({ switchToHttp: () => ({ getRequest: () => req }) }) as never;
const guard = new LineageGuard(fakePrisma as never);

test('thành viên họ A đọc dữ liệu họ A', async () => {
  assert.equal(await guard.canActivate(ctx({ user: { sub: 'u1' }, params: { lineageId: 'A' } })), true);
});

test('thành viên họ A đọc dữ liệu họ B bị từ chối (IDOR)', async () => {
  await assert.rejects(
    guard.canActivate(ctx({ user: { sub: 'u1' }, params: { lineageId: 'B' } })),
    ForbiddenException,
  );
});

test('người ngoài bị từ chối, kể cả khi lineageId nằm trong body/query', async () => {
  await assert.rejects(
    guard.canActivate(ctx({ user: { sub: 'x' }, params: {}, body: { lineageId: 'A' } })),
    ForbiddenException,
  );
  await assert.rejects(
    guard.canActivate(ctx({ user: { sub: 'x' }, params: {}, query: { lineageId: 'A' } })),
    ForbiddenException,
  );
});
