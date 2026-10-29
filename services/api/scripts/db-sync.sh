#!/bin/sh
# Đồng bộ schema lúc build trên Vercel.
# - Preview (build của PR): BỎ QUA — preview có thể dùng chung database với
#   production; không để một nhánh chưa merge đổi schema production.
# - Production / local: chạy script chuyển dữ liệu (idempotent) rồi db push.
#   Không dùng --accept-data-loss: thay đổi làm mất dữ liệu sẽ dừng build.
set -e
if [ "$VERCEL_ENV" = "preview" ]; then
  echo "[db-sync] VERCEL_ENV=preview — bỏ qua đồng bộ database"
  exit 0
fi
# Chạy mọi script trong prisma/sql theo thứ tự tên (đặt tên theo ngày).
for f in prisma/sql/*.sql; do
  echo "[db-sync] $f"
  npx prisma db execute --schema prisma/schema.prisma --file "$f"
done
npx prisma db push --skip-generate
