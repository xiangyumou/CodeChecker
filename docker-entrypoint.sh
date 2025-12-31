#!/bin/sh
set -e

# 设置默认 provider
DB_PROVIDER=${DB_PROVIDER:-postgresql}

echo "Detected DB_PROVIDER: $DB_PROVIDER"

# 动态修改 schema.prisma 的 provider 字段
# 这是 Prisma 官方推荐的处理多数据库类型的 workaround
sed -i "s/provider = \".*\"/provider = \"$DB_PROVIDER\"/g" prisma/schema.prisma

# 重新生成 Prisma Client (因为 provider 变了)
echo "Re-generating Prisma Client..."
npx prisma generate

# 运行迁移
if [ "$DB_PROVIDER" = "sqlite" ]; then
    echo "Running SQLite migrations (push)..."
    npx prisma db push --skip-generate
else
    echo "Running PostgreSQL migrations (deploy)..."
    npx prisma migrate deploy
fi

# 启动应用
echo "Starting application..."
exec "$@"
