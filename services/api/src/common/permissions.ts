import { LineageRole } from '@prisma/client';

/**
 * Ma trận quyền dùng chung — MỘT nguồn sự thật cho mọi module.
 *
 * 3 vai trò trong dòng họ + cờ người sở hữu (Trưởng tộc). Quyền gia phả,
 * quản trị thành viên, sự kiện, chat đều suy ra từ đây; không còn bảng cờ
 * quyền riêng (genealogy_permissions không được đọc nữa).
 */
export const ROLE_RANK: Record<LineageRole, number> = {
  MEMBER: 1,
  EDITOR: 2,
  ADMIN: 3,
};

export type LineageAction =
  | 'genealogy.view'
  | 'genealogy.propose'
  /** Xem SĐT, email, nhóm máu trong hồ sơ. */
  | 'genealogy.viewSensitive'
  /** Sửa trực tiếp, duyệt/từ chối đề xuất. */
  | 'genealogy.edit'
  /** Xuất Excel, tải bản sao lưu JSON. */
  | 'genealogy.export'
  /** Tự duyệt đề xuất do chính mình gửi. */
  | 'genealogy.selfApprove'
  /** Duyệt người vào họ, tạo mã mời, xóa thành viên (không phải ADMIN). */
  | 'members.manage'
  /** Cấp/thu vai trò EDITOR. */
  | 'roles.editor'
  /** Cấp/thu vai trò ADMIN, chuyển quyền sở hữu, xóa/sửa thông tin họ. */
  | 'owner';

const MIN_ROLE: Record<Exclude<LineageAction, 'owner'>, LineageRole> = {
  'genealogy.view': LineageRole.MEMBER,
  'genealogy.propose': LineageRole.MEMBER,
  'genealogy.viewSensitive': LineageRole.EDITOR,
  'genealogy.edit': LineageRole.EDITOR,
  'genealogy.export': LineageRole.EDITOR,
  'genealogy.selfApprove': LineageRole.ADMIN,
  'members.manage': LineageRole.ADMIN,
  'roles.editor': LineageRole.ADMIN,
};

export interface Actor {
  role: LineageRole;
  isOwner: boolean;
}

export function can(actor: Actor, action: LineageAction): boolean {
  if (actor.isOwner) return true;
  if (action === 'owner') return false;
  return ROLE_RANK[actor.role] >= ROLE_RANK[MIN_ROLE[action]];
}

/** Nhãn đời thường hiển thị cho người dùng. */
export function roleLabel(actor: Actor): string {
  if (actor.isOwner) return 'Trưởng tộc';
  switch (actor.role) {
    case LineageRole.ADMIN:
      return 'Ban quản trị';
    case LineageRole.EDITOR:
      return 'Người giữ gia phả';
    default:
      return 'Thành viên';
  }
}
