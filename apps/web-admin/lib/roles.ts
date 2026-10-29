/**
 * 3 vai trò trong dòng họ + Trưởng tộc (người sở hữu). Quyền thật do
 * backend quyết định (services/api/src/common/permissions.ts); giao diện
 * chỉ dùng để ẩn/hiện mục cho gọn.
 */

export type LineageRole = "MEMBER" | "EDITOR" | "ADMIN";

export interface MyLineage {
  id: string;
  name: string;
  myRole?: LineageRole;
  isOwner?: boolean;
}

export function roleLabel(role?: string, isOwner?: boolean): string {
  if (isOwner) return "Trưởng tộc";
  if (role === "ADMIN") return "Ban quản trị";
  if (role === "EDITOR") return "Người giữ gia phả";
  return "Thành viên";
}

/** Có việc quản lý (duyệt gia phả trở lên) trong họ này không. */
export function canManageLineage(l: MyLineage): boolean {
  return l.isOwner === true || l.myRole === "ADMIN" || l.myRole === "EDITOR";
}

export function isLineageAdmin(l: MyLineage): boolean {
  return l.isOwner === true || l.myRole === "ADMIN";
}
