# UI.md 设计规范完全实施计划

## 上下文

本项目是 Code Checker - 一个 AI 驱动的代码分析与优化工具。现有的前端虽然部分遵循了 UI.md 规范，但仍有以下问题需要修复：

1. **字体问题**: 使用了 Geist 字体而非 UI.md 规定的 Inter
2. **颜色token不一致**: 某些地方使用了 `muted-foreground` 而非 `muted`
3. **动效可能超标**: 需要审核所有动画是否符合"位移 ≤ 2px"的规范
4. **组件默认值**: 需要确保所有组件的默认值与UI.md一致
5. **Empty State**: 已实现，但需验证是否符合规范
6. **其他细节**: 如 toast 边框、markdown 样式等需要微调

## 设计目标

严格按照 UI.md 设计系统重新设计，确保：
- **12个核心变量** 正确应用
- **克制动效** (≤ 2px位移, scale 0.99)
- **边框优先于阴影**
- **背景层级 ≤ 2**
- **Inter 字体** 系统

## 需要修改的文件

### 1. 全局样式与字体 (Critical)
- `/src/app/globals.css`
  - 统一 `--muted` 变量名 (当前混用 `muted-foreground`)
  - 确保所有颜色使用 token
  - 添加 `prefers-reduced-motion` 媒体查询支持
  - 验证 toast 样式 (左侧边框指示)
  - 验证 code block 样式 (行号、背景色)

- `/src/app/layout.tsx`
  - 更换字体: Geist → Inter
  - 保持 Geist Mono 用于代码显示

### 2. UI 基础组件
- `/src/components/ui/button.tsx`
  - 验证 6种变体样式 (default, destructive, outline, secondary, ghost, link)
  - 验证尺寸系统 (sm: 32px, default: 36px, lg: 40px)
  - 验证 active: scale(0.99)
  - 验证 focus ring 样式

- `/src/components/ui/card.tsx`
  - 确认圆角使用 `--radius-xl`
  - 确认 padding 为 24px (p-6)
  - 确认默认无阴影

- `/src/components/ui/badge.tsx`
  - 验证语义变体使用透明色背景 (primary-a20, danger-a20 等)
  - 验证尺寸和字体大小

- `/src/components/ui/empty-state.tsx`
  - 验证已符合 5.12 规范
  - 确保图标大小 48px，颜色 muted，opacity 0.5

- `/src/components/ui/input.tsx` & `/src/components/ui/textarea.tsx`
  - 验证 focus 状态使用 `--ring` token

### 3. 业务组件
- `/src/components/Dashboard.tsx`
  - 审查动画: sidebar 展开/收起动画是否过于复杂
  - 替换为符合规范的简单动画

- `/src/components/SubmissionForm.tsx`
  - 验证 drag & drop 区域样式
  - 验证按钮样式
  - 检查 textarea focus 样式

- `/src/components/RequestList.tsx`
  - 验证列表项样式 (border-left 选中态)
  - 验证 hover 效果 (translateY(-2px) 符合规范)
  - 验证 Framer Motion stagger 动画

- `/src/components/RequestDetailPanel.tsx`
  - 验证 tabs 样式
  - 验证 loading skeleton 结构
  - 验证 alert 样式

- `/src/components/StatusBadge.tsx`
  - 验证使用 badge 组件的语义变体

- `/src/components/RequestDetailHeader.tsx` (需查看)
- `/src/components/RequestDetailTabs.tsx` (需查看)
- `/src/components/AnalysisSection.tsx` (需查看)
- `/src/components/ProblemDisplay.tsx` (需查看)

### 4. 详情页面 (Static Share Page)
- `/src/app/request/[id]/page.tsx`
  - 确认使用 Dashboard 组件

### 5. 新增/修复
- 添加 `prefers-reduced-motion` 全局支持
- 确保所有 toast 使用正确的语义变体类名
- 验证 markdown 渲染样式符合 5.13 规范

## 实施步骤

1. **第一步**: 修复 globals.css 和 layout.tsx (字体、token统一)
2. **第二步**: 修复 UI 基础组件 (button, card, badge, input)
3. **第三步**: 修复业务组件 (Dashboard, SubmissionForm, RequestList)
4. **第四步**: 修复详情相关组件 (RequestDetailPanel, StatusBadge等)
5. **第五步**: 验证响应式行为 (< 768px 移动端)
6. **第六步**: 运行测试确保无回归

## 验证清单

根据 UI.md 19节决策可回溯检查清单：

- [ ] 没有引入不在 Core Tokens 中的 Hex 颜色
- [ ] 没有手动写 opacity 或 hex alpha，而是使用 `-a10`/`-a20` 变量
- [ ] 没有给非浮层元素加阴影
- [ ] 动画位移 ≤ 2px，且可通过 prefers-reduced-motion 关闭
- [ ] 产品 UI 区域没有越级使用 H2/H1
- [ ] 嵌套圆角满足 Inner = Outer - Padding

## 测试计划

1. 视觉回归测试 (手动检查关键页面)
2. 运行现有测试: `npm test`
3. 移动端测试 (Chrome DevTools)
4. 暗色模式测试
5. 键盘导航测试 (Tab, Enter, Esc)
