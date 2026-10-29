-- ============================================================================
-- Gộp 7 vai trò dòng họ về 3 vai trò (28/10/2026).
-- Chạy TRƯỚC `prisma db push` (xem scripts/db-sync.sh). Idempotent: chỉ chạy
-- khi enum "LineageRole" còn giá trị cũ 'senior_admin'; lần sau là no-op.
--
-- Ánh xạ:
--   guest, app_member, member      -> member
--   genealogy_manager              -> editor
--   admin, senior_admin            -> admin
--   system_admin                   -> admin + users.is_platform_admin = true
-- Trưởng tộc (lineages.owner_user_id): người tạo họ nếu còn là quản trị cấp
-- cao; không thì quản trị cấp cao vào họ sớm nhất; không thì ADMIN sớm nhất.
-- Kèm theo: xóa bản ghi genealogy_permissions cấp họ (person_id IS NULL) —
-- quyền gia phả nay suy ra từ vai trò.
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'LineageRole' AND e.enumlabel = 'senior_admin'
  ) THEN
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;
    UPDATE users SET is_platform_admin = true
    WHERE id IN (
      SELECT user_id FROM lineage_memberships
      WHERE role = 'system_admin' AND status = 'approved'
    );

    ALTER TABLE lineages ADD COLUMN IF NOT EXISTS owner_user_id uuid;
    UPDATE lineages l SET owner_user_id = COALESCE(
      (SELECT m.user_id FROM lineage_memberships m
        WHERE m.lineage_id = l.id AND m.user_id = l.created_by
          AND m.status = 'approved'
          AND m.role IN ('senior_admin', 'system_admin')),
      (SELECT m.user_id FROM lineage_memberships m
        WHERE m.lineage_id = l.id AND m.status = 'approved'
          AND m.role IN ('senior_admin', 'system_admin')
        ORDER BY m.joined_at NULLS LAST, m.created_at LIMIT 1),
      (SELECT m.user_id FROM lineage_memberships m
        WHERE m.lineage_id = l.id AND m.status = 'approved'
          AND m.role = 'admin'
        ORDER BY m.joined_at NULLS LAST, m.created_at LIMIT 1)
    )
    WHERE l.owner_user_id IS NULL;

    CREATE TYPE "LineageRole_new" AS ENUM ('member', 'editor', 'admin');
    ALTER TABLE lineage_memberships ALTER COLUMN role DROP DEFAULT;
    ALTER TABLE lineage_memberships
      ALTER COLUMN role TYPE "LineageRole_new"
      USING (
        CASE role::text
          WHEN 'genealogy_manager' THEN 'editor'
          WHEN 'admin' THEN 'admin'
          WHEN 'senior_admin' THEN 'admin'
          WHEN 'system_admin' THEN 'admin'
          ELSE 'member'
        END
      )::"LineageRole_new";
    DROP TYPE "LineageRole";
    ALTER TYPE "LineageRole_new" RENAME TO "LineageRole";
    ALTER TABLE lineage_memberships
      ALTER COLUMN role SET DEFAULT 'member'::"LineageRole";

    DELETE FROM genealogy_permissions WHERE person_id IS NULL;
  END IF;
END $$;
