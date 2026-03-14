# CodeChecker 全面简化计划

## Context

项目当前是一个功能完整的 AI 代码分析工具，但存在过度设计问题：
- 技术栈过于复杂（tRPC、Zustand、next-intl 等）
- 架构按企业级 SaaS 设计，但实际只是小团队工具
- 数据层过度抽象，简单的 CRUD 操作经过多层封装
- 配置系统过于灵活，支持运行时修改但几乎不会用到

本计划将项目从"企业级架构"简化为"轻量级工具"，保持核心功能不变。

---

## 阶段 1: 移除 tRPC，改用 Server Actions

### 目标
将 4 个 tRPC 路由（requests、settings、prompts）迁移到 Next.js Server Actions

### 涉及的文件

**删除:**
- `/src/server/trpc.ts`
- `/src/server/routers/index.ts`
- `/src/server/routers/requests.ts`
- `/src/server/routers/settings.ts`
- `/src/server/routers/prompts.ts`
- `/src/app/api/trpc/[trpc]/route.ts`
- `/src/providers/TRPCProvider.tsx`
- `/src/utils/trpc.ts`
- `/src/hooks/useSmartPolling.ts`

**修改:**
- `/src/providers/Providers.tsx` - 移除 TRPCProvider
- `/src/app/layout.tsx` - 调整 Providers 使用

**新建:**
- `/src/app/actions/requests.ts` - Server Actions for requests
- `/src/app/actions/settings.ts` - Server Actions for settings
- `/src/app/actions/prompts.ts` - Server Actions for prompts

### 实现细节

#### requests.ts Server Actions
```typescript
'use server';

import { db } from '@/lib/db';
import { requests } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function listRequests(options?: { status?: string; limit?: number }) {
  const query = db.select({
    id: requests.id,
    status: requests.status,
    userPrompt: requests.userPrompt,
    isSuccess: requests.isSuccess,
    createdAt: requests.createdAt,
    updatedAt: requests.updatedAt,
    errorMessage: requests.errorMessage,
  }).from(requests).orderBy(desc(requests.createdAt));

  if (options?.limit) {
    query.limit(options.limit);
  }

  return query;
}

export async function getRequestById(id: number) {
  const result = await db.select().from(requests).where(eq(requests.id, id)).limit(1);
  return result[0] || null;
}

export async function createRequest(data: { userPrompt?: string; imageReferences?: string[] }) {
  // ... 创建逻辑
  revalidatePath('/');
  return request;
}

export async function retryRequest(id: number) {
  // ... 重试逻辑
  revalidatePath('/');
  return request;
}

export async function deleteRequest(id: number) {
  await db.delete(requests).where(eq(requests.id, id));
  revalidatePath('/');
}
```

### 组件更新

更新以下组件，使用 Server Actions 替代 tRPC hooks:
- `/src/components/Dashboard.tsx`
- `/src/components/RequestList.tsx`
- `/src/components/RequestDetailPanel.tsx`
- `/src/components/SubmissionForm.tsx`

---

## 阶段 2: 移除 Zustand，使用本地状态

### 目标
将 Zustand store 替换为 React useState 和 Context

### 涉及的文件

**删除:**
- `/src/store/useUIStore.ts`
- `/src/store/__tests__/useUIStore.test.ts`

**修改:**
- `/src/components/Dashboard.tsx` - 使用 useState 管理面板状态
- `/src/components/LanguageSwitcher.tsx` - 直接使用 cookie

### 实现细节

#### Dashboard.tsx 状态简化
```typescript
// 替换前 (Zustand)
const { rightPanelMode, selectedRequestId, selectRequest, createNewRequest } = useUIStore();

// 替换后 (useState)
const [rightPanelMode, setRightPanelMode] = useState<'create' | 'detail'>('create');
const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

const selectRequest = (id: number) => {
  setSelectedRequestId(id);
  setRightPanelMode('detail');
};

const createNewRequest = () => {
  setSelectedRequestId(null);
  setRightPanelMode('create');
};
```

---

## 阶段 3: 简化国际化

### 目标
移除 next-intl，改用简单的 TypeScript 对象 + 服务端渲染

### 涉及的文件

**删除:**
- `/src/i18n/request.ts`
- `/src/i18n/routing.ts`
- `/messages/en.json`
- `/messages/de.json`
- `/src/components/LanguageSwitcher.tsx`
- `/src/components/__tests__/LanguageSwitcher.test.tsx`

**修改:**
- `/src/app/layout.tsx` - 移除 next-intl Provider
- `/src/providers/Providers.tsx` - 移除 NextIntlClientProvider

**新建:**
- `/src/lib/i18n/index.ts` - 简单的翻译对象

### 实现细节

#### /src/lib/i18n/index.ts
```typescript
export const translations = {
  zh: {
    app: {
      title: 'Code Checker',
      newRequest: '新建请求',
    },
    // ... 其他翻译
  }
};

export function t(key: string, params?: Record<string, string>): string {
  // 简单的点号路径解析
  const value = key.split('.').reduce((obj, k) => obj?.[k], translations.zh as any);
  if (!value) return key;
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
  }
  return value;
}
```

### 组件更新

所有使用 `useTranslations` 的组件改为导入 `t` 函数或使用服务端传递的翻译。

---

## 阶段 4: 简化数据库 Schema

### 目标
移除 Pipeline 阶段跟踪字段，简化状态管理

### 涉及的文件

**修改:**
- `/src/lib/db/schema.ts`

### 实现细节

#### schema.ts 简化
```typescript
// 替换前 - 复杂的阶段跟踪
export const requests = sqliteTable('requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  status: text('status').default('QUEUED').notNull(),
  userPrompt: text('user_prompt'),
  imageReferences: text('image_references', { mode: 'json' }),
  problemDetails: text('problem_details', { mode: 'json' }),
  formattedCode: text('formatted_code'),
  analysisResult: text('analysis_result', { mode: 'json' }),
  // 移除以下字段
  // stage1Status: text('stage1_status').default('pending'),
  // stage2Status: text('stage2_status').default('pending'),
  // stage3Status: text('stage3_status').default('pending'),
  // stage1CompletedAt: integer(...),
  // stage2CompletedAt: integer(...),
  // stage3CompletedAt: integer(...),
  gptRawResponse: text('gpt_raw_response', { mode: 'json' }),
  errorMessage: text('error_message'),
  isSuccess: integer('is_success', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// 保留 settings 表，但简化使用
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').unique().notNull(),
  value: text('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});
```

#### 数据迁移
需要创建 drizzle 迁移，删除阶段字段:
```sql
-- migration.sql
ALTER TABLE requests DROP COLUMN stage1_status;
ALTER TABLE requests DROP COLUMN stage2_status;
ALTER TABLE requests DROP COLUMN stage3_status;
ALTER TABLE requests DROP COLUMN stage1_completed_at;
ALTER TABLE requests DROP COLUMN stage2_completed_at;
ALTER TABLE requests DROP COLUMN stage3_completed_at;
```

---

## 阶段 5: 简化队列系统

### 目标
移除队列的复杂生命周期管理，保留核心并发控制

### 涉及的文件

**修改:**
- `/src/lib/queue/memory-queue.ts`

### 实现细节

#### memory-queue.ts 简化
```typescript
import PQueue from 'p-queue';
import { processAnalysisTask } from './processor';

const queue = new PQueue({ concurrency: 3 });

export function addAnalysisTask(requestId: number): void {
  queue.add(async () => {
    try {
      await processAnalysisTask(requestId);
    } catch (error) {
      console.error(`Task ${requestId} failed:`, error);
      // 简单重试一次
      await processAnalysisTask(requestId).catch(() => {
        console.error(`Task ${requestId} failed after retry`);
      });
    }
  });
}

// 导出队列实例供状态检查
export { queue };
```

**移除的功能:**
- `initializeQueue()` - 不需要初始化
- `getQueueStatus()` - 不需要状态检查
- `pauseQueue()` / `resumeQueue()` - 不需要暂停/恢复
- `clearQueue()` - 不需要清空
- `waitForQueueIdle()` - 不需要等待
- `shutdownQueue()` - 不需要优雅关闭
- 指数退避重试 - 改为简单的一次重试

---

## 阶段 6: 简化配置系统

### 目标
移除数据库配置覆盖功能，直接使用环境变量

### 涉及的文件

**修改:**
- `/src/lib/settings.ts`
- `/src/lib/queue/processor.ts` - 直接使用 env
- `/src/app/actions/settings.ts` - 只保留基本读取

### 实现细节

#### settings.ts 简化
```typescript
// 从环境变量读取设置
export function getSetting(key: string): string | undefined {
  return process.env[key];
}

export function getAllSettings(): Record<string, string> {
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || '',
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
    MODEL_SUPPORTS_VISION: process.env.MODEL_SUPPORTS_VISION || 'true',
    REQUEST_TIMEOUT_SECONDS: process.env.REQUEST_TIMEOUT_SECONDS || '180',
    MAX_CONCURRENT_ANALYSIS_TASKS: process.env.MAX_CONCURRENT_ANALYSIS_TASKS || '3',
  };
}

// 保留 AppSettings 常量用于类型提示
export const AppSettings = {
  MAX_CONCURRENT_ANALYSIS_TASKS: 'MAX_CONCURRENT_ANALYSIS_TASKS',
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  OPENAI_BASE_URL: 'OPENAI_BASE_URL',
  OPENAI_MODEL: 'OPENAI_MODEL',
  MODEL_SUPPORTS_VISION: 'MODEL_SUPPORTS_VISION',
  REQUEST_TIMEOUT_SECONDS: 'REQUEST_TIMEOUT_SECONDS',
} as const;
```

**移除的功能:**
- 数据库配置表查询
- 配置覆盖功能
- 运行时配置修改 API

---

## 阶段 7: 简化轮询机制

### 目标
移除智能轮询，使用固定间隔或 Server-Sent Events

### 涉及的文件

**删除:**
- `/src/utils/polling.ts`
- `/src/hooks/useSmartPolling.ts`

**修改:**
- `/src/components/RequestList.tsx` - 使用简单 setInterval
- `/src/components/RequestDetailPanel.tsx` - 使用简单 setInterval

### 实现细节

#### RequestList.tsx 简化轮询
```typescript
useEffect(() => {
  const loadRequests = async () => {
    const data = await listRequests();
    setRequests(data);
  };

  loadRequests();

  // 固定 5 秒轮询
  const interval = setInterval(loadRequests, 5000);
  return () => clearInterval(interval);
}, []);
```

---

## 阶段 8: 简化 Processor

### 目标
移除 Pipeline 阶段跟踪，简化处理逻辑

### 涉及的文件

**修改:**
- `/src/lib/queue/processor.ts`

### 实现细节

#### processor.ts 简化
```typescript
export async function processAnalysisTask(requestId: number): Promise<void> {
  try {
    // 1. 加载请求
    const request = await db.select().from(requests).where(eq(requests.id, requestId)).limit(1).then(r => r[0]);
    if (!request || request.status === 'COMPLETED' || request.status === 'FAILED') {
      return;
    }

    // 2. 更新为处理中
    await db.update(requests).set({ status: 'PROCESSING' }).where(eq(requests.id, requestId));

    // 3. 加载配置
    const settings = getAllSettings();
    // ... OpenAI 客户端初始化

    // 4. 并行执行 Step 1 & 2
    const [problemData, codeData] = await Promise.all([
      // Step 1
      openai.chat.completions.create({...}),
      // Step 2
      openai.chat.completions.create({...}),
    ]);

    // 5. 执行 Step 3
    const analysisResult = await openai.chat.completions.create({...});

    // 6. 保存结果
    await db.update(requests).set({
      status: 'COMPLETED',
      problemDetails: JSON.parse(problemData.choices[0].message.content),
      formattedCode: JSON.parse(codeData.choices[0].message.content).code,
      analysisResult: JSON.parse(analysisResult.choices[0].message.content),
      isSuccess: true,
    }).where(eq(requests.id, requestId));

  } catch (error) {
    await db.update(requests).set({
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      isSuccess: false,
    }).where(eq(requests.id, requestId));
    throw error;
  }
}
```

**移除的功能:**
- 阶段状态更新（stage1Status, stage2Status, stage3Status）
- 阶段完成时间记录
- 详细的日志记录（保留基本错误日志）

---

## 阶段 9: 更新 UI 组件

### 涉及的文件

**修改:**
- `/src/components/PipelineStatus.tsx` - 简化或移除 Pipeline 显示
- `/src/components/RequestDetailPanel.tsx` - 移除 Pipeline 状态依赖

### 实现细节

#### PipelineStatus.tsx 简化
由于移除了阶段跟踪，Pipeline 显示可以简化或完全移除。如果保留，只显示整体状态：

```typescript
// 简化版本 - 只显示 QUEUED/PROCESSING/COMPLETED/FAILED
export function PipelineStatus({ status }: { status: string }) {
  const statusMap = {
    QUEUED: { label: '等待中', color: 'bg-yellow-500' },
    PROCESSING: { label: '处理中', color: 'bg-blue-500' },
    COMPLETED: { label: '已完成', color: 'bg-green-500' },
    FAILED: { label: '失败', color: 'bg-red-500' },
  };

  const config = statusMap[status as keyof typeof statusMap] || statusMap.QUEUED;

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      <span>{config.label}</span>
    </div>
  );
}
```

---

## 阶段 10: 清理依赖

### 目标
从 package.json 移除不再需要的依赖

### 移除的依赖

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.90.14",
    "@trpc/client": "^11.8.1",
    "@trpc/react-query": "^11.8.1",
    "@trpc/server": "^11.8.1",
    "next-intl": "^4.6.1",
    "superjson": "^2.2.6",
    "zustand": "^5.0.9"
  },
  "devDependencies": {
    "@testing-library/react": "^16.3.1",
    "@testing-library/user-event": "^14.6.1",
    "@testing-library/jest-dom": "^6.9.1"
  }
}
```

### 保留的核心依赖

```json
{
  "dependencies": {
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "drizzle-orm": "^0.45.1",
    "better-sqlite3": "^12.6.2",
    "p-queue": "^9.1.0",
    "openai": "^6.15.0",
    "tailwindcss": "^4",
    "@radix-ui/*": "...",
    "lucide-react": "...",
    "shiki": "^3.20.0"
  }
}
```

---

## 阶段 11: 更新测试

### 目标
移除与新架构不兼容的测试，更新保留的测试

### 涉及的文件

**删除:**
- `/src/components/__tests__/Dashboard.test.tsx` - 需要重写
- `/src/components/__tests__/RequestList.test.tsx` - 需要重写
- `/src/components/__tests__/RequestDetailPanel.test.tsx` - 需要重写
- `/src/components/__tests__/SubmissionForm.test.tsx` - 需要重写
- `/src/components/__tests__/ThemeSwitcher.test.tsx` - 如果保留组件则更新
- `/src/components/__tests__/LanguageSwitcher.test.tsx` - 组件删除
- `/src/components/__tests__/PipelineStatus.test.tsx` - 组件重写
- `/src/store/__tests__/useUIStore.test.ts` - Store 删除
- `/src/server/routers/__tests__/*` - 路由删除

**保留并更新:**
- `/src/lib/__tests__/utils.test.ts`
- `/src/components/ui/__tests__/button.test.tsx`
- `/src/lib/prompts/__tests__/loader.test.ts`
- `/src/lib/queue/__tests__/processor.test.ts` - 简化
- `/src/lib/services/__tests__/task-recovery.test.ts` - 简化

---

## 阶段 12: 更新启动流程

### 目标
简化 instrumentation.ts，移除队列初始化

### 涉及的文件

**修改:**
- `/instrumentation.ts`

### 实现细节

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { markIncompleteTasksAsFailed } = await import('@/lib/services/task-recovery');
    await markIncompleteTasksAsFailed();
  }
}
```

---

## 文件变更汇总

### 删除的文件 (18 个)
```
/src/server/trpc.ts
/src/server/routers/index.ts
/src/server/routers/requests.ts
/src/server/routers/settings.ts
/src/server/routers/prompts.ts
/src/app/api/trpc/[trpc]/route.ts
/src/providers/TRPCProvider.tsx
/src/utils/trpc.ts
/src/utils/polling.ts
/src/hooks/useSmartPolling.ts
/src/store/useUIStore.ts
/src/store/__tests__/useUIStore.test.ts
/src/i18n/request.ts
/src/i18n/routing.ts
/messages/en.json
/messages/de.json
/src/components/LanguageSwitcher.tsx
/src/components/__tests__/LanguageSwitcher.test.tsx
```

### 新建的文件 (4 个)
```
/src/app/actions/requests.ts
/src/app/actions/settings.ts
/src/app/actions/prompts.ts
/src/lib/i18n/index.ts
```

### 修改的文件 (15 个)
```
/src/app/layout.tsx
/src/providers/Providers.tsx
/src/lib/db/schema.ts
/src/lib/settings.ts
/src/lib/queue/memory-queue.ts
/src/lib/queue/processor.ts
/src/components/Dashboard.tsx
/src/components/RequestList.tsx
/src/components/RequestDetailPanel.tsx
/src/components/SubmissionForm.tsx
/src/components/PipelineStatus.tsx
/src/components/ThemeSwitcher.tsx
/instrumentation.ts
/package.json
/next.config.ts
```

---

## 验证清单

### 功能验证
- [ ] 提交分析请求正常工作
- [ ] 请求列表正确显示
- [ ] 请求详情页正常显示
- [ ] 重试功能正常工作
- [ ] 删除功能正常工作
- [ ] 轮询更新正常工作
- [ ] AI 分析流程正常完成
- [ ] 错误处理正常工作

### 构建验证
- [ ] `npm run build` 成功
- [ ] `npm run lint` 无错误
- [ ] `npm run test` 通过的测试无错误

### 部署验证
- [ ] 开发模式正常启动
- [ ] 生产构建正常启动
- [ ] 数据库迁移正常执行

---

## 简化后的架构

```
┌─────────────────────────────────────────────────────────────┐
│                         前端层                               │
├─────────────────────────────────────────────────────────────┤
│  Dashboard  ──►  RequestList / SubmissionForm / DetailPanel │
│       │                                                     │
│       └──►  useState (本地状态)                              │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ Server Actions
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                       Server Actions                         │
├─────────────────────────────────────────────────────────────┤
│  requests.ts  ──►  list / get / create / retry / delete     │
│  settings.ts  ──►  getSettings                              │
│  prompts.ts   ──►  getPrompt                                │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      业务逻辑层                              │
├─────────────────────────────────────────────────────────────┤
│  memory-queue.ts  ──►  简单的 PQueue 包装                   │
│       │                                                     │
│       └──►  processor.ts  ──►  OpenAI 三阶段分析            │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                        数据层                                │
├─────────────────────────────────────────────────────────────┤
│  Drizzle ORM  ──►  SQLite (better-sqlite3)                  │
│       │                                                     │
│       └──►  requests 表 (简化 Schema)                        │
│       └──►  settings 表 (可选，用于 prompts)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 注意事项

1. **数据库迁移**: 删除字段需要创建迁移文件，确保数据不丢失
2. **类型定义**: 删除文件后需要检查并修复类型引用
3. **样式保持**: 简化逻辑但保持现有 UI 样式
4. **错误处理**: 保留基本错误处理，移除过度包装
5. **日志**: 可以简化 logger，使用 console 替代 pino

---

# 补充计划：修复测试失败

## 问题 1: processor.test.ts - Vision 支持检查测试失败

### 现象
测试 "should throw error if images provided but model does not support vision" 失败：
- 期望错误: "Model does not support vision"
- 实际错误: "Cannot read properties of undefined (reading 'choices')"

### 根因
简化后的 `processor.ts` 移除了 vision 支持检查逻辑。原代码会在调用 API 前检查 `MODEL_SUPPORTS_VISION` 配置，但简化版本直接调用 OpenAI API，导致当 mock 未正确设置时抛出 API 错误而非预期的配置错误。

### 解决方案

**选项 A: 在 processor.ts 中添加 vision 支持检查（推荐）**

在 processor.ts 第 44-45 行之间添加：
```typescript
// 检查 vision 支持
const imageReferences = (request.imageReferences as unknown as string[]) || [];
const supportsVision = process.env.MODEL_SUPPORTS_VISION !== 'false';

if (imageReferences.length > 0 && !supportsVision) {
    throw new Error('Model does not support vision');
}
```

**选项 B: 移除该测试（如果不认为 vision 检查是必需的）**

如果认为 vision 支持检查是过度设计，可以直接删除该测试用例。

---

## 问题 2: button.test.tsx - 缺少 @testing-library/react 依赖

### 现象
测试套件无法启动：
```
Error: Failed to resolve import "@testing-library/react"
```

### 根因
在阶段 10（清理依赖）中，从 package.json 移除了：
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`

但 `button.test.tsx` 仍然依赖这些库。

### 解决方案

**选项 A: 恢复必要的测试依赖（推荐）**

重新安装测试依赖：
```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**选项 B: 移除 button.test.tsx**

如果这是一个简单的 UI 组件测试，且不希望维护额外的依赖，可以删除该测试文件。但考虑到这是一个基础组件，保留测试更有价值。

---

## 修复清单

### 修复 1: Vision 支持检查
- [ ] 选择方案 A 或 B 并实施
- [ ] 验证 processor.test.ts 通过

### 修复 2: 测试依赖
- [ ] 选择方案 A 或 B 并实施
- [ ] 验证 button.test.tsx 通过

### 验证所有测试
- [ ] `npm run test` 全部通过
