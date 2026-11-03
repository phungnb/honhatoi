-- Kiểm toán 30/10/2026 (L3): ràng buộc ở tầng DB mà schema.prisma đã hứa
-- nhưng chưa tạo. Chạy lại nhiều lần không lỗi.
DO $$
BEGIN
  IF to_regclass('public.family_relationships') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'family_relationships_not_self'
     ) THEN
    ALTER TABLE family_relationships
      ADD CONSTRAINT family_relationships_not_self
      CHECK (person_id <> related_person_id);
  END IF;
END $$;
