# 修复计划：分析结果页面问题修复

## 问题概述

用户报告了三个问题：
1. 问题描述加载不进来，需要刷新才能显示
2. 修改分析显示数量但内容空白
3. 长内容无法滚动

## 根本原因分析

### 问题 1：问题描述加载问题
- **位置**: `src/components/RequestDetail.tsx`
- **原因**: Polling 逻辑在请求状态变化时可能无法正确触发数据刷新。当请求从 `PROCESSING` 变为 `COMPLETED` 时，依赖数组 `[loadRequest]` 不会变化，导致 `useEffect` 不会重新执行。虽然 `request` 状态变化会触发第二个 `useEffect`，但 `loadRequest` 函数引用不变，可能存在竞态条件。
- **具体代码**: 第 85-98 行的 polling 逻辑

### 问题 2：修改分析内容空白
- **位置**: `src/components/RequestDetail.tsx` 第 42-56 行
- **原因**: **数据字段名不匹配**
  - Prompt 定义和 `AnalysisSection.tsx` 使用的字段名：`original_snippet`, `modified_snippet`, `explanation`
  - `RequestDetail.tsx` 中 `getAnalysisData` 期望的字段名：`original`, `modified`, `reason`
- 这导致虽然有数据（所以数量显示正确），但字段名不匹配导致内容渲染时为空。

### 问题 3：无法滚动
- **位置**: `src/components/Dashboard.tsx` 和 `src/components/RequestDetail.tsx`
- **原因**:
  - `Dashboard.tsx` 第 132 行使用了 `overflow-hidden`，但没有确保子元素能正确继承高度
  - `RequestDetail.tsx` 第 253 行的 `ScrollArea` 虽然设置了 `flex-1`，但外层容器的高度定义可能不正确
  - `ProblemDisplay.tsx` 中内容区域使用 `pb-10` 等样式，但滚动容器的高度约束有问题

## 修复方案

### 修复 1：Polling 逻辑改进
**文件**: `src/components/RequestDetail.tsx`

修改 polling useEffect，添加 `request?.status` 到依赖数组，确保状态变化时正确处理：

```typescript
// 修改第 89-98 行
useEffect(() => {
    if (!requestId) return;
    if (!request || (request.status !== 'QUEUED' && request.status !== 'PROCESSING')) {
        return;
    }

    const interval = setInterval(loadRequest, 5000);
    return () => clearInterval(interval);
}, [requestId, request?.status, loadRequest]); // 添加 request?.status
```

### 修复 2：统一数据字段名
**文件**: `src/components/RequestDetail.tsx`

修改 `getAnalysisData` 中的类型定义，使用正确的字段名：

```typescript
// 修改第 48-54 行
modification_analysis?: Array<{
    section?: string;
    location?: string;
    original_snippet?: string;  // 从 original 改为 original_snippet
    modified_snippet?: string;  // 从 modified 改为 modified_snippet
    explanation?: string;       // 从 reason 改为 explanation
}>;
```

同时修改第 362-386 行的渲染逻辑，使用正确的字段名：
- `block.original` → `block.original_snippet`
- `block.modified` → `block.modified_snippet`
- `block.reason` → `block.explanation`

### 修复 3：修复滚动问题
**文件**: `src/components/Dashboard.tsx`

确保右侧内容区域可以正确滚动：

```typescript
// 修改第 132-134 行
<div className="h-full flex flex-col overflow-hidden">
```

需要在 `RequestDetail.tsx` 确保 ScrollArea 的高度约束正确：

```typescript
// 第 253 行保持不变，但确保外层容器高度正确
<ScrollArea className="flex-1 min-h-0">
```

## 验证步骤

1. **问题描述加载**:
   - 提交一个新请求
   - 等待状态变为 COMPLETED
   - 验证问题描述是否能自动显示（无需刷新）

2. **修改分析显示**:
   - 打开一个已完成的请求
   - 展开"修改分析"部分
   - 验证每条建议都能正确显示原始代码、修改后代码和解释

3. **滚动功能**:
   - 打开一个包含长问题描述的请求
   - 验证可以在卡片内滚动查看完整内容
   - 测试 diff 对比区域、修改分析区域的滚动

## 关键文件

| 文件 | 修改内容 |
|------|----------|
| `src/components/RequestDetail.tsx` | 修复 polling 依赖、统一字段名 |
| `src/components/Dashboard.tsx` | 验证滚动容器高度 |
| `src/components/ProblemDisplay.tsx` | 无需修改（字段名正确） |
| `src/components/AnalysisSection.tsx` | 无需修改（字段名正确） |

## 预期结果

1. 分析完成后，问题描述能自动显示
2. 修改分析能正确显示每条建议的详细内容
3. 长内容可以在分析结果卡片内正常滚动
