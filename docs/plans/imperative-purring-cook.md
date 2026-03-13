# 数据库迁移：PostgreSQL + Prisma → SQLite + Drizzle

## 背景

当前项目使用 PostgreSQL + Prisma 作为数据库方案。对于 2-10 人的小团队本地部署：
- PostgreSQL 需要单独容器，增加部署复杂度
- Prisma 是重型 ORM，对小项目过度设计
- SQLite 文件数据库更适合单机部署，零配置
- Drizzle 是轻量级 ORM，更符合 SQL 直觉

## 迁移方案

### 1. 安装依赖

```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3
npm uninstall @prisma/client prisma
```

### 2. 创建 Drizzle Schema

**新文件**: `src/lib/db/schema.ts`

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const requests = sqliteTable('requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  status: text('status').default('QUEUED').notNull(), // QUEUED, PROCESSING, COMPLETED, FAILED
  userPrompt: text('user_prompt'),
  imageReferences: text('image_references', { mode: 'json' }),

  // Multi-stage pipeline fields
  problemDetails: text('problem_details', { mode: 'json' }),
  formattedCode: text('formatted_code'),
  analysisResult: text('analysis_result', { mode: 'json' }),

  // Pipeline stage tracking
  stage1Status: text('stage1_status').default('pending'),
  stage2Status: text('stage2_status').default('pending'),
  stage3Status: text('stage3_status').default('pending'),
  stage1CompletedAt: integer('stage1_completed_at', { mode: 'timestamp' }),
  stage2CompletedAt: integer('stage2_completed_at', { mode: 'timestamp' }),
  stage3CompletedAt: integer('stage3_completed_at', { mode: 'timestamp' }),

  gptRawResponse: text('gpt_raw_response', { mode: 'json' }),
  errorMessage: text('error_message'),
  isSuccess: integer('is_success', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').unique().notNull(),
  value: text('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});
```

### 3. 更新数据库连接层

**修改文件**: `src/lib/db.ts`

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './db/schema';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import logger from './logger';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = process.env.DATA_DIR || './data';
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const sqlitePath = path.join(dataDir, 'codechecker.db');

// Create database connection
const sqlite = new Database(sqlitePath);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');

// Create drizzle instance
export const db = drizzle(sqlite, { schema });

// Run migrations on startup
export function runMigrations() {
    try {
        const migrationsFolder = path.join(process.cwd(), 'drizzle');
        migrate(db, { migrationsFolder });
        logger.info('Database migrations completed');
    } catch (error) {
        logger.error({ error }, 'Failed to run migrations');
        throw error;
    }
}

// For tests - allow creating isolated connections
export function createTestDB(dbPath: string) {
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    return drizzle(sqlite, { schema });
}
```

### 4. 创建 Drizzle 配置文件

**新文件**: `drizzle.config.ts`

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/lib/db/schema.ts',
    out: './drizzle',
    dialect: 'sqlite',
    dbCredentials: {
        url: process.env.DATABASE_URL || './data/codechecker.db',
    },
});
```

### 5. 更新 Settings 模块

**修改文件**: `src/lib/settings.ts`

```typescript
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function getSetting(key: string, defaultValue?: string): Promise<string | undefined> {
    try {
        const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
        if (result[0]?.value) {
            return result[0].value;
        }
    } catch (error) {
        console.error(`Failed to fetch setting ${key}:`, error);
    }

    return process.env[key] || defaultValue;
}

export async function getAllSettings(): Promise<Record<string, string>> {
    try {
        const allSettings = await db.select().from(settings);
        return allSettings.reduce((acc, setting) => {
            acc[setting.key] = setting.value;
            return acc;
        }, {} as Record<string, string>);
    } catch (error) {
        console.error('Failed to fetch settings:', error);
        return {};
    }
}
```

### 6. 更新 tRPC Context

**修改文件**: `src/server/trpc.ts`

```typescript
import { initTRPC } from '@trpc/server';
import { db } from '@/lib/db';
import superjson from 'superjson';

export const createTRPCContext = async (opts: { headers: Headers }) => {
    return {
        db,
        headers: opts.headers,
    };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
    transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
    const token = ctx.headers.get('x-admin-token');
    if (token !== process.env.SETTINGS_TOKEN) {
        throw new Error('UNAUTHORIZED');
    }
    return next({ ctx });
});
```

### 7. 更新 Task Recovery

**修改文件**: `src/lib/services/task-recovery.ts`

```typescript
import { db } from '@/lib/db';
import { requests } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import logger from '@/lib/logger';

export async function markIncompleteTasksAsFailed() {
    try {
        // Mark PROCESSING tasks as FAILED
        const processingResult = await db
            .update(requests)
            .set({
                status: 'FAILED',
                errorMessage: 'Service restarted while task was processing. You can retry it manually.',
                isSuccess: false,
            })
            .where(eq(requests.status, 'PROCESSING'));

        // Mark QUEUED tasks as FAILED
        const queuedResult = await db
            .update(requests)
            .set({
                status: 'FAILED',
                errorMessage: 'Service restarted while task was queued. You can retry it manually.',
                isSuccess: false,
            })
            .where(eq(requests.status, 'QUEUED'));

        const total = processingResult.changes + queuedResult.changes;

        if (total > 0) {
            logger.warn(
                { processing: processingResult.changes, queued: queuedResult.changes, total },
                'Marked incomplete tasks as FAILED due to service restart'
            );
        } else {
            logger.info('No incomplete tasks found on service startup');
        }

        return {
            processing: processingResult.changes,
            queued: queuedResult.changes,
            total
        };
    } catch (error) {
        logger.error({ err: error }, 'Failed to mark incomplete tasks as failed');
        return { processing: 0, queued: 0, total: 0 };
    }
}
```

### 8. 更新 Queue Processor

**修改文件**: `src/lib/queue/processor.ts`

- 替换 `prisma.request.findUnique` → `db.select().from(requests).where(eq(requests.id, requestId)).limit(1)`
- 替换 `prisma.request.update` → `db.update(requests).set(...).where(eq(requests.id, requestId))`
- 注意：SQLite 的 JSON 字段处理方式

### 9. 更新 Requests Router

**修改文件**: `src/server/routers/requests.ts`

- 替换所有 `ctx.prisma.request.*` 调用为 Drizzle 查询
- 主要变更：
  - `create`: `db.insert(requests).values(...)`
  - `findMany`: `db.select().from(requests).where(...)`
  - `findUnique`: `db.select().from(requests).where(eq(requests.id, id)).limit(1)`
  - `update`: `db.update(requests).set(...).where(...)`
  - `delete`: `db.delete(requests).where(...)`
  - `deleteMany`: `db.delete(requests).where(...)`

### 10. 更新 Prompt Loader

**修改文件**: `src/lib/prompts/loader.ts`

- 替换 `prisma.setting.findUnique` 为 Drizzle 查询

### 11. 删除 Prisma 相关文件

**删除**:
- `prisma/schema.prisma`
- `prisma/` 目录
- `scripts/update-prisma-provider.js` (如存在)

### 12. 更新 package.json scripts

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "postinstall": "drizzle-kit generate"
  }
}
```

### 13. 更新 docker-compose.yml

移除 PostgreSQL 服务，使用本地 SQLite 文件：

```yaml
services:
  code-checker:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: code-checker
    env_file:
      - .env
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATA_DIR=/app/data
    volumes:
      - ./data:/app/data  # 持久化 SQLite 数据库
    restart: unless-stopped
```

### 14. 更新 .env.example

```
# SQLite Configuration
DATABASE_URL=./data/codechecker.db
DATA_DIR=./data

# OpenAI Configuration
OPENAI_API_KEY=sk-placeholder
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
MODEL_SUPPORTS_VISION=true

# Task Queue Configuration
MAX_CONCURRENT_ANALYSIS_TASKS=3

# Request Timeout (seconds)
REQUEST_TIMEOUT_SECONDS=180

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Settings Security
SETTINGS_TOKEN=your_secure_token

# Logging Configuration
LOG_LEVEL=info
LOG_PRETTY=false
```

### 15. 更新 Dockerfile

确保数据目录权限正确：

```dockerfile
# ... existing Dockerfile content ...

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs
```

### 16. 更新类型定义

**检查文件**: `src/types/request.ts`

确保类型与 Drizzle schema 一致。

### 17. 更新所有测试文件

- `src/server/routers/__tests__/requests.test.ts`
- `src/lib/services/__tests__/task-recovery.test.ts`
- `src/lib/prompts/__tests__/loader.test.ts`
- `src/server/routers/__tests__/security.test.ts`

使用内存 SQLite 或 mock 进行测试。

## 关键差异和注意事项

### 1. JSON 字段处理
- Prisma: `Json` 类型自动序列化/反序列化
- Drizzle SQLite: 使用 `text('field', { mode: 'json' })`，需要手动处理

### 2. DateTime 处理
- Prisma: 原生 DateTime 类型
- Drizzle SQLite: 使用 integer timestamp，需要转换

### 3. Boolean 处理
- Prisma: 原生 Boolean
- Drizzle SQLite: 使用 integer (0/1)，配置 `mode: 'boolean'`

### 4. 自增 ID
- Prisma: `@id @default(autoincrement())`
- Drizzle: `integer('id').primaryKey({ autoIncrement: true })`

### 5. 查询语法
- Prisma: 对象式查询，如 `prisma.request.findMany({ where: { status: 'QUEUED' } })`
- Drizzle: 链式 SQL builder，如 `db.select().from(requests).where(eq(requests.status, 'QUEUED'))`

## 迁移步骤

1. 导出现有 PostgreSQL 数据（如果需要保留）
2. 安装新依赖
3. 创建 schema.ts
4. 生成并运行迁移
5. 逐个替换数据库调用
6. 删除 Prisma 相关文件
7. 更新测试
8. 全面测试

## 回滚方案

如果需要回滚：
1. 恢复 `prisma/schema.prisma`
2. 重新安装 `@prisma/client` 和 `prisma`
3. 恢复旧版 `src/lib/db.ts`
4. 从备份恢复 PostgreSQL 数据

## 验证步骤

1. 运行 `npm install`
2. 运行 `npm run db:generate` 生成迁移
3. 运行 `npm run db:migrate` 应用迁移
4. 运行 `npm run build` 确保编译通过
5. 运行 `npm test` 确保所有测试通过
6. 启动应用，测试完整流程
