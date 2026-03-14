#!/bin/sh
set -e

# 获取数据库路径，默认为 SQLite 文件
DB_PATH="${DATABASE_URL:-./data/codechecker.db}"

# 转换为绝对路径（移除 ./ 前缀）
DB_PATH="/app/${DB_PATH#./}"

# 检查数据库文件是否存在，不存在则执行迁移
if [ ! -f "$DB_PATH" ]; then
    echo "Database not found at $DB_PATH, running migrations..."
    npx drizzle-kit migrate --config drizzle.config.ts
    echo "Migrations completed."
else
    echo "Database already exists at $DB_PATH, skipping migrations."
fi

# 启动应用
echo "Starting application..."
exec "$@"
