# CodeChecker

AI 驱动的 ACM/OI 竞赛编程代码调试工具。

[![Docker](https://img.shields.io/badge/Docker-Required-blue)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[English](./README.md) | 简体中文

---

## 快速开始（需要 Docker）

> **重要提示：** 本项目仅官方支持 Docker 部署方式。

### 前置要求
- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) V2

### 1. 克隆并配置
```bash
git clone https://github.com/xiangyumou/CodeChecker.git
cd CodeChecker

# 复制环境变量模板
cp .env.example .env

# 编辑配置（必需）
nano .env  # 或使用你喜欢的编辑器
```

### 2. 部署
```bash
# 一键部署
./deploy.sh

# 或使用 Make
make start
```

### 3. 访问
打开 http://localhost:3000

---

## 为什么选择 CodeChecker？

### 你遇到的问题
你在解决算法题时，代码通过了样例测试，但是：
- ❌ 在隐藏测试用例中失败，却不知道错在哪里
- ❌ 大数据超时（TLE），找不到性能瓶颈
- ❌ 遗漏了边界情况，但不确定具体是哪些

### CodeChecker 的解决方案
CodeChecker 帮你定位代码中的 Bug：
- ✅ **理解题目**：从截图或文字描述中提取题目要求
- ✅ **分析代码**：找出代码中的逻辑错误、边界问题
- ✅ **提供修复**：给出最小化修改建议，保留你的代码风格
- ✅ **解释原因**：详细说明每处修改的原因

---

## 功能特性

### 代码分析
- 通过文本或图片提交问题描述
- 上传最多 5 张图片（JPG/PNG，每张最大 2MB）
- 支持拖拽上传或从剪贴板粘贴
- 实时状态更新（5 秒轮询）

### 三阶段分析流水线
1. **问题提取** - 从文本/图片中提取结构化的问题详情（标题、约束、示例）
2. **代码格式化** - 清理和结构化提交的代码
3. **深度分析** - 识别 Bug 并提供修复建议和解释

### 结果展示
- 结构化的问题详情（标题、时间/内存限制、描述、示例）
- 带语法高亮的源代码，支持一键复制
- 并排对比视图（原始代码 vs 修改后的代码）
- 详细的修改分析，解释每处修复

### 设置面板（`/settings`）
- 基于令牌的管理员认证（通过 `SETTINGS_TOKEN`）
- 通用设置：
  - OpenAI API 密钥和基础 URL
  - 模型选择（默认：gpt-4o）
  - 视觉支持开关
  - 最大并发任务数（默认：3）
  - 请求超时时间（默认：180 秒）
- 每个分析阶段的提示词自定义
- 数据管理：
  - 删除单个请求
  - 清理旧请求（按时间：分钟、小时、天、月）
  - 清空所有数据

### 国际化支持
- English (en)
- 简体中文 (zh)
- Deutsch (de)

### 主题支持
- 深色模式切换
- 浅色模式切换
- 系统偏好检测

---

## 工作原理

1. **提交** 你的代码和问题描述（文本或图片）
2. **入队** - 请求进入 BullMQ 队列（基于 Redis）
3. **处理** - 后台工作进程通过三个阶段处理：
   - 阶段 1 & 2 并行运行（问题提取 + 代码格式化）
   - 阶段 3 使用阶段 1 & 2 的结果进行深度分析
4. **存储** - 结果保存到 PostgreSQL
5. **显示** - UI 每 5 秒轮询状态更新

---

## 使用指南

### 提交分析请求

1. 导航到首页
2. 在文本区域输入问题描述
3. （可选）通过以下方式上传最多 5 张图片：
   - 点击上传
   - 拖拽上传
   - 从剪贴板粘贴（Ctrl+V）
4. 点击"提交"开始分析

### 查看结果

- 点击侧边栏中的任意请求查看详情
- 结果分四个标签页显示：
  - **问题** - 结构化的问题详情（标题、限制、描述、示例）
  - **代码** - 带语法高亮的格式化源代码
  - **差异** - 原始代码与修改后代码的并排对比
  - **分析** - 每处修改的详细解释

### 重试失败的请求

如果分析失败，你可以从请求详情页面重新提交。

### 访问设置

1. 导航到 `/settings`
2. 输入你的 `SETTINGS_TOKEN` 进行认证
3. 配置：
  - OpenAI API 设置
  - 模型选择和并发数
  - 每个阶段的自定义提示词
  - 数据管理（删除/清理请求）

---

## 使用场景示例

### 场景 1：定位逻辑错误
```
你的代码：边界条件判断有误
→ CodeChecker 定位问题
→ 指出具体哪行有问题
→ 提供修复方案并解释原因
```

### 场景 2：发现超时原因
```
你的代码：循环范围错误导致 TLE
→ CodeChecker 识别问题
→ 给出修复后的循环范围
→ 解释为什么原来的写法会超时
```

### 场景 3：处理边界情况
```
你的代码：遗漏了数据范围的边界情况
→ CodeChecker 根据题目约束分析
→ 发现哪些边界情况未处理
→ 补充必要的边界判断代码
```

---

## 配置说明

### 环境变量

| 变量 | 描述 | 必需 | 默认值 |
|------|------|------|--------|
| **数据库** | | | |
| `DB_PROVIDER` | 数据库提供商 | 是 | `postgresql` |
| `DB_USER` | 数据库用户名 | 是 | `codechecker` |
| `DB_PASSWORD` | 数据库密码 | 是 | - |
| `DB_HOST` | 数据库主机 | 是 | `postgres` |
| `DB_PORT` | 数据库端口 | 是 | `5432` |
| `DB_NAME` | 数据库名称 | 是 | `codechecker` |
| **OpenAI** | | | |
| `OPENAI_API_KEY` | OpenAI API 密钥 | 是 | - |
| `OPENAI_BASE_URL` | API 端点 | 否 | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | 模型名称 | 否 | `gpt-4o` |
| `MODEL_SUPPORTS_VISION` | 启用图片支持 | 否 | `true` |
| **队列** | | | |
| `MAX_CONCURRENT_ANALYSIS_TASKS` | 工作并发数 | 否 | `3` |
| `REQUEST_TIMEOUT_SECONDS` | 请求超时时间 | 否 | `180` |
| **其他** | | | |
| `NEXT_PUBLIC_APP_URL` | 应用 URL | 是 | `http://localhost:3000` |
| `SETTINGS_TOKEN` | 管理面板令牌 | 是 | - |
| `LOG_LEVEL` | 日志级别 | 否 | `info` |
| `LOG_PRETTY` | 美化日志输出 | 否 | `false` |
| `REDIS_HOST` | Redis 主机 | 是 | `redis` |
| `REDIS_PORT` | Redis 端口 | 是 | `6379` |

> **数据库支持说明：**
> PostgreSQL 是**唯一官方支持并经过测试**的数据库。
> 虽然其他数据库可能技术上可用，但不在支持范围内。

---

## 常用命令

```bash
make help          # 显示所有可用命令
make logs          # 查看应用日志
make logs-all      # 查看所有服务日志
make restart       # 重启服务
make stop          # 停止所有服务
make clean         # 删除所有数据（⚠️ 破坏性操作）
```

---

## 架构设计

### 服务

| 服务 | 描述 | 端口 | 内存 |
|------|------|------|------|
| `code-checker` | Next.js 应用 | 3000 | ~500MB |
| `postgres` | PostgreSQL 16 数据库 | 5432 | ~200MB |
| `redis` | BullMQ 队列用 Redis 7 | 6379 | ~30MB |

**总计：~730MB**（可在 1GB VPS 上运行）

### 技术栈

**前端：**
- Next.js 16（App Router）
- React 19
- TypeScript
- Tailwind CSS
- Radix UI 组件
- Framer Motion（动画）
- Zustand（状态管理）

**后端：**
- tRPC（类型安全 RPC）
- Prisma ORM
- BullMQ（基于 Redis 的任务队列）
- bcrypt（密码哈希）
- Pino（日志记录）

**数据库：**
- PostgreSQL 16（唯一支持的数据库）

**测试：**
- Vitest（单元测试）
- Playwright（E2E 测试）

### 任务处理

- **队列：** BullMQ with Redis
- **工作并发：** 可配置（默认：3）
- **重试策略：** 3 次重试，指数退避（2s, 4s, 8s）
- **任务保留：** 100 个成功任务（24小时），200 个失败任务（7 天）

---

## 开发

> **注意：** 本项目仅官方支持 Docker 部署。本地开发设置不在文档或支持范围内。

### 运行测试

#### 单元测试
```bash
npm test           # 运行所有单元测试
npm run test:watch # 监听模式
```

#### E2E 测试（Playwright）

首先安装 Playwright 浏览器：
```bash
npx playwright install
```

然后运行测试：
```bash
npm run test:e2e:smoke  # 基本 UI 测试（不需要 API）
npm run test:e2e:full   # 完整分析流程（需要 OPENAI_API_KEY）
npm run test:e2e        # 所有 E2E 测试
npm run test:e2e:ui     # 交互式 Playwright UI
```

### 数据库管理
```bash
make db-migrate    # 运行迁移
make db-studio     # 打开 Prisma Studio
```

### 查看日志
```bash
make logs          # 仅应用
make logs-all      # 所有服务
```

---

## 故障排查

### 服务无法启动
```bash
# 检查 Docker 状态
docker compose ps

# 查看详细日志
docker compose logs

# 清理重启
make clean && make start
```

### VPS 内存不足
- 确保已配置 swap
- 检查 `docker-compose.yml` 中的内存限制
- 最低建议：1GB RAM

### 数据库连接错误
- 验证 PostgreSQL 健康状态：`docker compose ps`
- 检查 `.env` 中的 `DATABASE_URL`
- 确保数据库已初始化：`make db-migrate`

### 分析卡在队列中
- 检查 Redis 是否运行：`docker compose ps`
- 验证 `MAX_CONCURRENT_ANALYSIS_TASKS` 设置
- 查看工作进程日志：`docker compose logs -f code-checker`

---

## 生产部署

### 使用 Docker 的 VPS（推荐）

1. 在 VPS 上按照快速开始步骤操作
2. 配置域名和 SSL（nginx/Caddy）
3. 设置生产环境变量

### 使用 GitHub Actions 的 CI/CD

查看 [CI/CD 设置指南](docs/cicd-setup.md) 了解自动化部署。

**部署用的 GitHub Secrets：**
- `VPS_HOST` - VPS 主机名/IP
- `VPS_USERNAME` - SSH 用户名
- `VPS_SSH_KEY` - SSH 私钥
- `VPS_PORT` - SSH 端口（默认：22）

---

## 安全性

- 基于令牌的管理员认证（`SETTINGS_TOKEN`）
- 使用 bcrypt 进行密码哈希
- 无用户账户系统（无状态）
- 除分析结果外不保留任何数据

---

## 支持的 AI 模型

- **OpenAI**：GPT-4o、GPT-4 Turbo、GPT-3.5 Turbo
- **Google Gemini**：Gemini 1.5 Pro、Flash（通过 OpenAI 兼容端点）
- 任何兼容 OpenAI API 的服务

---

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 贡献指南

欢迎贡献！请：
1. Fork 本仓库
2. 创建功能分支
3. 使用 Docker 测试
4. 提交 Pull Request

---

**注意：** 本项目仅官方支持 **Docker 部署**。

---

祝你编程愉快！🎯 如果 CodeChecker 帮助你调试了代码或通过了棘手的测试用例，请给我们一个星标！⭐
