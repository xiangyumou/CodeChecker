# UI 简化修改计划

## 目标
1. 简化项目首页 UI，移除不必要的元素，优化布局
2. 删除 i18n 支持，直接使用中文文本

---

## 第一部分：UI 布局修改

### 1. `/root/workspace/CodeChecker/src/components/Dashboard.tsx`

**修改内容：**
- 删除左上角的 Logo 图标和 "Code Checker" 文字（第 71-74 行）
- 删除 ThemeSwitcher 的导入（第 6 行）和使用（第 98 行）
- 将"新建请求"按钮从左侧移到最右侧

**注意：** 保留自动主题切换功能（跟随系统设置），只删除手动切换按钮

**修改详情：**
```typescript
// 删除：
import ThemeSwitcher from '@/components/ThemeSwitcher';  // 第 6 行
import Logo from '@/components/Logo';  // 第 7 行

// 删除（第 71-74 行）：
<div className="bg-primary-a10 rounded-lg p-2 hidden md:block">
    <Logo />
</div>
<h2 className="font-bold hidden md:block">Code Checker</h2>

// 删除（第 98 行）：
<ThemeSwitcher />

// 移动"新建请求"按钮到最右边的 div 中（第 87-95 行移到第 97-99 行的 div 中）
```

### 2. `/root/workspace/CodeChecker/src/components/RequestList.tsx`

**修改内容：**
- 删除"分析历史"标题（有数据和无数据状态都要删）
- 删除刷新按钮
- 删除相关的 `isRefetching` state 和 `handleRefresh` 函数
- **删除 i18n**：将 `translate()` 调用替换为直接中文文本

**修改详情：**
```typescript
// 删除导入：
import { translate } from '@/lib/i18n';
import { RefreshCw, Sparkles } from 'lucide-react';
// 改为：
import { Sparkles } from 'lucide-react';

// 删除（第 24 行）：
const [isRefetching, setIsRefetching] = useState(false);

// 删除（第 45-49 行）：
const handleRefresh = async () => {
    setIsRefetching(true);
    await loadRequests();
    setTimeout(() => setIsRefetching(false), 500);
};

// 删除无数据时的标题和刷新按钮（第 80-85 行）
// 删除有数据时的标题和刷新按钮区域（第 99-113 行）

// 替换 translate 调用：
// translate('requestList.noHistory') -> '暂无分析历史'
// translate('requestList.submitToSeeHere') -> '在该处提交请求以进行查看。'
// translate('requestList.itemTitle', { id: request.id }) -> `请求 #${request.id}`
// translate('requestList.noPromptContent') -> '无输入内容'
```

---

## 第二部分：删除 i18n 支持

### 需要修改的文件列表：

#### 1. `/root/workspace/CodeChecker/src/components/ImageGallery.tsx`
- 删除 `import { translate } from '@/lib/i18n';`
- `translate('requestDetails.submittedImages', { count: items.length })` → `'提交的图片 (${items.length}张)'`
- `translate('requestDetails.submittedImageAlt', { index: idx + 1 })` → `'提交的图片 ${idx + 1}'`

#### 2. `/root/workspace/CodeChecker/src/components/AnalysisSection.tsx`
- 删除 translate 导入（如果存在）
- `translate('requestDetails.noAnalysisDetails')` → `'分析结果中未包含详细的修改点分析'`
- `translate('requestDetails.originalSnippet')` → `'原始片段'`
- `translate('requestDetails.modifiedSnippet')` → `'修改后片段'`
- `translate('requestDetails.explanation')` → `'说明'`

#### 3. `/root/workspace/CodeChecker/src/components/StatusBadge.tsx`
- 删除 `import { translate } from '@/lib/i18n';`
- `translate(`requestList.${config.label}`)` → 直接根据状态返回中文

#### 4. `/root/workspace/CodeChecker/src/components/ProblemDisplay.tsx`
- 删除 `import { translate } from '@/lib/i18n';`
- `translate('requestDetails.none')` → `'无'`
- `translate('requestDetails.problemDescription')` → `'问题描述'`
- `translate('requestDetails.inputFormat')` → `'输入格式'`
- `translate('requestDetails.outputFormat')` → `'输出格式'`
- `translate('requestDetails.samples')` → `'样例'`
- `translate('requestDetails.inputSample')` → `'输入样例'`
- `translate('requestDetails.outputSample')` → `'输出样例'`
- `translate('requestDetails.notes')` → `'提示'`

#### 5. `/root/workspace/CodeChecker/src/components/SubmissionForm.tsx`
- 删除 `import { translate } from '@/lib/i18n';`
- 替换所有 toast 消息和 placeholder 为中文

#### 6. `/root/workspace/CodeChecker/src/components/RequestDetail.tsx`
- 删除 `import { translate } from '@/lib/i18n';`
- 替换所有 translate 调用为中文

### 最后删除 i18n 文件：
- 删除 `/root/workspace/CodeChecker/src/lib/i18n/index.ts`

---

## 关于主题切换的说明

当前配置已经是 `defaultTheme="system"`，会自动跟随系统主题设置：
- 系统设置为 light → 页面显示 light 主题
- 系统设置为 dark → 页面显示 dark 主题

只是删除了手动切换按钮，用户可以通过修改系统主题来切换页面主题。

---

## 验证步骤

1. 启动开发服务器：`npm run dev` 或 `pnpm dev`
2. 访问首页，确认：
   - 左上角没有 Logo 和 "Code Checker" 文字
   - "新建请求"按钮在导航栏最右侧
   - 没有 Light/Dark 手动切换按钮
   - 左侧边栏没有"分析历史"标题
   - 左侧边栏没有刷新按钮
   - 修改系统主题设置，页面主题会自动切换
   - 所有文本正确显示为中文，没有 translate key 显示
