/**
 * Kiểm tra vòng lặp huyết thống: thêm quan hệ "cha mẹ → con" không được
 * khiến một người thành tổ tiên của chính mình (ví dụ khai cháu là cha của
 * ông nội). Hàm thuần để test được không cần database.
 */

export type ParentEdge = { parentId: string; childId: string };

/** Các loại quan hệ mà personId là "bề trên" (cha mẹ) của relatedPersonId. */
export const PARENT_TYPES = ['parent', 'adoptive_parent'];
/** Các loại quan hệ mà personId là con của relatedPersonId. */
export const CHILD_TYPES = ['child', 'adoptive_child'];

/**
 * Quy một quan hệ về cạnh cha mẹ → con. Trả null nếu không phải quan hệ
 * cha mẹ/con (vợ chồng không tạo vòng lặp thế hệ).
 */
export function toParentEdge(
  personId: string,
  relatedPersonId: string,
  relationshipType: string,
): ParentEdge | null {
  if (PARENT_TYPES.includes(relationshipType))
    return { parentId: personId, childId: relatedPersonId };
  if (CHILD_TYPES.includes(relationshipType))
    return { parentId: relatedPersonId, childId: personId };
  return null;
}

/**
 * Thêm cạnh `edge` có tạo vòng không? Có, khi cha mẹ mới là chính người con
 * hoặc là hậu duệ của người con.
 */
export function createsCycle(existing: ParentEdge[], edge: ParentEdge): boolean {
  if (edge.parentId === edge.childId) return true;
  const children = new Map<string, string[]>();
  for (const e of existing) {
    const list = children.get(e.parentId);
    if (list) list.push(e.childId);
    else children.set(e.parentId, [e.childId]);
  }
  const seen = new Set<string>([edge.childId]);
  const queue = [edge.childId];
  while (queue.length) {
    const cur = queue.shift() as string;
    for (const c of children.get(cur) ?? []) {
      if (c === edge.parentId) return true;
      if (!seen.has(c)) {
        seen.add(c);
        queue.push(c);
      }
    }
  }
  return false;
}
