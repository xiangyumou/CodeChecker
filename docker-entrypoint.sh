#!/bin/sh
set -e

DB_PATH="${DATABASE_URL:-./data/codechecker.db}"

# 提取目录路径
DB_DIR=$(dirname "$DB_PATH")

# 创建数据目录（确保存在且有权限）
if [ -n "$DB_DIR" ] && [ "$DB_DIR" != "." ]; then
    echo "[INIT] Ensuring database directory exists: $DB_DIR"
    mkdir -p "$DB_DIR"
fi

# 只在首次启动时执行迁移
if [ ! -f "$DB_PATH" ]; then
    echo "[INIT] Database not found at $DB_PATH, running migrations..."
    npm run db:migrate
    echo "[INIT] Migrations completed."
else
    echo "[INIT] Database already exists at $DB_PATH, skipping migrations."
fi

# 启动应用
echo "[INIT] Starting application..."
exec node server.js
