# 🚀 CodeChecker: ACM/OI 代码调试助手

[![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)
[![Live Demo](https://img.shields.io/badge/Demo-code.xiangyu.pro-blue?style=for-the-badge)](https://code.xiangyu.pro)

[English](./README.md) | 简体中文

> 🎮 **[在线体验 Demo →](https://code.xiangyu.pro)**

**CodeChecker** 是一款专为 **ACM/OI** 竞赛选手设计的代码调试助手。只需粘贴代码或上传题目截图，即可获得代码 Bug 分析和修复建议。

---

## 💡 为什么选择 CodeChecker？

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

## ✨ 核心功能

### 🔍 **三阶段分析流水线**
1. **问题提取**：上传题目截图，AI 自动提取约束条件、示例和要求
2. **代码格式化**：整理代码格式，移除杂乱内容，便于分析
3. **Bug 分析**：定位代码中的逻辑错误，提供修复方案和详细解释

### 📸 **截图支持**
不想手动输入题目？直接截图即可！CodeChecker 能够：
- 从图片中提取题目描述
- 从截图中识别代码
- 处理混乱的输入格式

### ⚡ **实时进度追踪**
通过三阶段流水线可视化工具，实时观察分析过程：
- 🔵 阶段 1：提取题目信息...
- 🔵 阶段 2：格式化代码...
- 🔵 阶段 3：分析 Bug 并生成修复...

### 📊 **可视化差异对比**
通过对比视图清晰看到原始代码和修复版本的差异：
- 左右对照比较
- 语法高亮差异
- 逐行解释修改原因

### 🌐 **多语言支持**
界面支持以下语言：
- 🇺🇸 English（英语）
- 🇨🇳 简体中文
- 🇩🇪 Deutsch（德语）

---

## 🚀 快速开始

### 方式 1：Docker 部署（推荐）

1. **克隆并运行**
   ```bash
   git clone https://github.com/xiangyumou/CodeChecker.git
   cd CodeChecker
   docker compose up -d
   ```

2. **在浏览器中打开**
   访问 [http://localhost:3000](http://localhost:3000)

3. **配置 `.env` 文件**
   编辑 `.env` 文件，设置必要的配置项：
   - `SETTINGS_TOKEN` - 管理员 Token（用于访问 `/settings` 页面）
   - `OPENAI_API_KEY` - OpenAI API 密钥（或兼容端点）

### 方式 2：本地开发

1. **前置要求**
   - Node.js 20+
   - npm/yarn/pnpm

2. **安装与配置**
   ```bash
   git clone https://github.com/xiangyumou/CodeChecker.git
   cd CodeChecker
   npm install
   cp .env.example .env  # 编辑文件填入你的 API 密钥
   npx prisma db push
   npm run dev
   ```

3. **访问应用**
   打开 [http://localhost:3000](http://localhost:3000)

---

## 📖 使用指南

### 基础工作流

1. **提交问题和代码**
   - 选项 A：粘贴问题描述 + 你的代码
   - 选项 B：上传两者的截图

2. **等待分析**（约 30-60 秒）
   - 实时观察流水线处理你的请求

3. **查看结果**
   - **问题标签页**：查看结构化的题目信息
   - **代码标签页**：格式化后的代码
   - **差异标签页**：原始代码与修复版本的对比
   - **分析标签页**：每处修改的详细解释

4. **应用修复**
   - 复制修复后的代码
   - 根据解释理解错误原因

### 使用场景示例

**场景 1：定位逻辑错误**
```
你的代码：边界条件判断有误
→ CodeChecker 定位问题
→ 指出具体哪行有问题
→ 提供修复方案并解释原因
```

**场景 2：发现超时原因**
```
你的代码：循环范围错误导致 TLE
→ CodeChecker 识别问题
→ 给出修复后的循环范围
→ 解释为什么原来的写法会超时
```

**场景 3：处理边界情况**
```
你的代码：遗漏了数据范围的边界情况
→ CodeChecker 根据题目约束分析
→ 发现哪些边界情况未处理
→ 补充必要的边界判断代码
```

---

## 🛠️ 配置说明

### 支持的 AI 模型
- **OpenAI**：GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo
- **Google Gemini**：Gemini 1.5 Pro, Flash（通过 OpenAI 兼容端点）
- 任何兼容 OpenAI API 的服务

### 环境变量
```bash
OPENAI_API_KEY=your_key_here
OPENAI_BASE_URL=https://api.openai.com/v1  # 或你的提供商端点
OPENAI_MODEL=gpt-4o  # 模型名称
MODEL_SUPPORTS_VISION=true  # 启用截图支持
MAX_CONCURRENT_ANALYSIS_TASKS=3  # 并行处理限制
```

---

## 🤝 贡献指南

热爱竞赛编程？帮我们让 CodeChecker 变得更好！

1. Fork 本仓库
2. 创建功能分支（`git checkout -b feature/amazing-improvement`）
3. 提交你的修改（`git commit -m 'Add edge case detector'`）
4. 推送并创建 Pull Request

---

## 📄 许可证

MIT License - 可自由用于个人或商业项目！

---

## 🙏 致谢

- 由 OpenAI GPT 模型驱动
- 基于 Next.js、Prisma 和 tRPC 构建
- UI 组件来自 Shadcn UI
- 语法高亮由 Shiki 提供

---

**祝你编程愉快！🎯** 如果 CodeChecker 帮助你调试代码或通过了棘手的测试用例，请给我们一个星标！⭐
