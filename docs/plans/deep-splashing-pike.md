# 项目清理计划：移除遗留代码

## 背景

项目中存在大量遗留代码，包括已删除功能的引用、未使用的组件、以及改用新架构后遗留的代码。本计划旨在全面清理这些遗留代码，保持代码库整洁。

## 清理范围

### 1. 未使用的组件（4个）

| 文件 | 原因 | 操作 |
|------|------|------|
| `src/components/PageHeader.tsx` | 引用不存在的 `next-intl` 和 `LanguageSwitcher` | 删除 |
| `src/components/PipelineStatus.tsx` | 多阶段流水线已改为单次 API 调用 | 删除 |
| `src/components/AnalysisSection.tsx` | 逻辑已内联到 RequestDetail | 删除 |
| `src/components/ThemeProvider.tsx` | Providers.tsx 直接使用 next-themes | 删除 |

### 2. 未使用的 UI 组件（6个）

| 文件 | 原因 | 操作 |
|------|------|------|
| `src/components/ui/input.tsx` | 项目使用 textarea 而非 input | 删除 |
| `src/components/ui/dropdown-menu.tsx` | 无使用场景 | 删除 |
| `src/components/ui/label.tsx` | 无使用场景 | 删除 |
| `src/components/ui/alert-dialog.tsx` | 无使用场景 | 删除 |
| `src/components/ui/tooltip.tsx` | 无使用场景 | 删除 |
| `src/components/ui/tabs.tsx` | 无使用场景 | 删除 |

### 3. 遗留的数据库代码

| 文件 | 原因 | 操作 |
|------|------|------|
| `src/lib/db/schema.ts` - settings 表 | 已改用环境变量配置 | 删除表定义 |
| `src/app/actions/settings.ts` | 相关函数未被调用 | 删除文件 |
| `src/lib/settings.ts` - AppSettings 常量 | 未使用 | 删除常量 |

**注意**：保留 `src/lib/settings.ts` 中的 `config` 对象，它用于从环境变量读取配置。

### 4. E2E 测试遗留代码

| 文件 | 原因 | 操作 |
|------|------|------|
| `e2e/utils/api-helpers.ts` - createRequestViaAPI, getRequestViaAPI | 引用已不存在的 tRPC 端点 | 删除这些函数 |
| `e2e/full/performance.spec.ts` | 引用已不存在的 tRPC 端点和 /settings 页面 | 删除文件或更新测试 |
| `e2e/full/analysis-flow.spec.ts` | 尝试拦截不存在的 /api/trpc/** 路由 | 删除相关测试 |
| `e2e/smoke/homepage.spec.ts` | 测试已移除的语言切换器 | 删除相关测试 |
| `e2e/fixtures/test-base.ts` | 引用 LanguageSwitcher | 删除相关代码 |

### 5. 未使用的依赖（3个）

| 依赖 | 原因 | 操作 |
|------|------|------|
| `@types/uuid` | 无 uuid 依赖 | 从 devDependencies 移除 |
| `react-intersection-observer` | 未使用 useInView | 从 dependencies 移除 |
| `@types/dotenv` | Next.js/Node 原生支持 .env | 从 devDependencies 移除 |

## 验证步骤

1. 运行 `npm install` 确认依赖清理无误
2. 运行 `npm run build` 确认项目能正常构建
3. 运行 `npm run lint` 确认无 lint 错误
4. 运行 `npm test` 确认单元测试通过
5. 运行 `npm run test:e2e:smoke` 确认 E2E 测试通过

## 风险说明

- **低风险**：删除未使用的组件和依赖，不影响功能
- **中低风险**：删除 settings 表，确保无代码调用相关函数
- **中风险**：修改 E2E 测试，需要验证测试是否仍能有效覆盖核心功能

## 回滚方案

所有更改将通过 git 提交，如有问题可快速回滚。
