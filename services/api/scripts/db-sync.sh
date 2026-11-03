#!/bin/sh
# Đồng bộ schema lúc build trên Vercel.
# - Preview (build của PR) chạy trên Neon branch "preview" riêng (từ
#   30/10/2026, DATABASE_URL của preview khác production) nên được đồng bộ
#   như production — PR đổi schema thử được mà không chạm dữ liệu thật.
#   Không dùng --accept-data-loss: thay đổi làm mất dữ liệu sẽ dừng build.
set -e
# Chạy mọi script trong prisma/sql theo thứ tự tên (đặt tên theo ngày).
for f in prisma/sql/*.sql; do
  echo "[db-sync] $f"
  npx prisma db execute --schema prisma/schema.prisma --file "$f"
done
npx prisma db push --skip-generate
