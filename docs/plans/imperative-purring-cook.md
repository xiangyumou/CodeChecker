# 移除 Redis，改用内存队列

## 背景

当前项目使用 Redis + BullMQ 处理代码分析任务队列。对于 2-10 人的小团队使用，这是过度设计：
- 用户量小，不会高并发
- 不会频繁请求分析
- Redis 增加了部署复杂度和资源消耗

## 简化方案：使用 p-queue 内存队列

保留队列的核心价值（异步处理、并发控制），但移除 Redis 依赖，改用轻量级的内存队列。

## 需要修改的文件

### 1. 安装依赖
```bash
npm install p-queue
npm uninstall bullmq ioredis
```

### 2. 创建新的内存队列实现

**新文件**: `src/lib/queue/memory-queue.ts`
- 使用 `p-queue` 实现内存队列
- 保持并发控制（默认可配置，如 3 个并发）
- 保持失败重试逻辑（指数退避）
- 任务状态仍通过数据库管理

**核心实现思路**:
```typescript
import PQueue from 'p-queue';
import { processAnalysisTask } from './processor';

const queue = new PQueue({ concurrency: 3 });

export async function addAnalysisTask(requestId: number) {
    return queue.add(async () => {
        // 重试逻辑包装
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await processAnalysisTask(requestId);
                return;
            } catch (error) {
                if (attempt === 3) throw error;
                await sleep(2000 * Math.pow(2, attempt - 1));
            }
        }
    });
}
```

### 3. 修改 API 路由

**文件**: `src/server/routers/requests.ts`

将原来的 BullMQ 入队：
```typescript
await analysisQueue.add('analyze', { requestId }, { jobId: `analyze-${requestId}` });
```

改为调用内存队列：
```typescript
// 不 await，让任务在后台运行
addAnalysisTask(request.id).catch(err => {
    logger.error({ err, requestId: request.id }, 'Task failed after retries');
});
```

### 4. 删除/简化文件

**删除**:
- `src/lib/queue/redis.ts` - Redis 连接不再需要
- `src/lib/queue/analysis-queue.ts` - BullMQ 队列不再需要

**修改**:
- `src/lib/services/task-recovery.ts` - 服务启动时标记 PROCESSING 为 FAILED（保持不变，逻辑仍然有效）
- `instrumentation.ts` - 移除 Worker 初始化

### 5. 更新 docker-compose.yml

移除 Redis 服务，简化部署：
```yaml
services:
  # 删除 redis 服务
  postgres:
    # 保持不变
  code-checker:
    # 移除 REDIS_HOST, REDIS_PORT 环境变量
    depends_on:
      # 移除 redis
      postgres:
        condition: service_healthy
```

### 6. 更新 .env.example

移除 Redis 相关配置：
```
# 删除以下配置
# REDIS_HOST=localhost
# REDIS_PORT=6379
```

## 保持不变的特性

1. **数据库状态管理** - 仍使用 Prisma 的 Request 表跟踪状态
2. **前端轮询** - 无需修改，继续轮询获取结果
3. **并发控制** - p-queue 提供相同的并发限制功能
4. **失败重试** - 手动实现指数退避重试
5. **任务恢复** - 启动时将 PROCESSING 标记为 FAILED

## 移除的功能（对小团队无影响）

1. **任务持久化** - 内存队列重启后任务丢失，但小团队可接受
2. **分布式 Worker** - 单实例部署不需要
3. **任务清理策略** - 内存队列自动清理，无需配置

## 验证步骤

1. 运行 `npm install` 安装/移除依赖
2. 运行 `npm run build` 确保编译通过
3. 运行 `npm run dev` 启动开发服务器
4. 提交一个代码分析请求
5. 验证任务状态流转：QUEUED -> PROCESSING -> COMPLETED
6. 验证并发控制（同时提交多个请求）
7. 验证失败重试（模拟 API 错误）
8. 验证重启后任务恢复

## 回滚方案

如果内存队列不满足需求，可以：
1. 恢复被删除的文件
2. 重新安装 bullmq 和 ioredis
3. 恢复 docker-compose.yml 中的 Redis 服务
