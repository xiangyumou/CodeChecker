# 🚀 CodeChecker: 竞赛编程的 AI 代码调试助手

[![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](./LICENSE)
[![Live Demo](https://img.shields.io/badge/Demo-code.xiangyu.pro-blue?style=for-the-badge)](https://code.xiangyu.pro)

[English](./README.md) | 简体中文

> 🎮 **[在线体验 Demo →](https://code.xiangyu.pro)**

**CodeChecker** 是一款专为 **ICPC**、**LeetCode** 和算法竞赛选手设计的智能编程助手。只需粘贴代码或上传题目截图，即可获得关于正确性、边界情况、复杂度分析和优化建议的即时反馈。

---

## 💡 为什么选择 CodeChecker？

### 你遇到的问题
你在解决算法题时，代码通过了样例测试，但是：
- ❌ 在隐藏测试用例中失败，错误信息难以理解
- ❌ 大数据超时（TLE - Time Limit Exceeded）
- ❌ 遗漏了你没想到的边界情况
- ❌ 能跑通，但代码不够优雅

### CodeChecker 的解决方案
CodeChecker 就像你的 **AI 代码审查员**：
- ✅ **理解题目**：从截图或文字描述中提取问题要求
- ✅ **验证逻辑**：检查你的解法是否真正解决了问题
- ✅ **发现边界情况**：找出你可能遗漏的极端测试用例
- ✅ **分析时空复杂度**：并提供优化建议
- ✅ **精准定位修改点**：通过对比视图清晰展示改进方案

---

## ✨ 核心功能

### 🔍 **三阶段分析流水线**
1. **问题提取**：上传题目截图（来自 LeetCode、Codeforces 等），AI 自动提取约束条件、示例和要求
2. **代码验证**：检查你的解法是否真正解决问题——而不仅仅是能否编译通过
3. **深度审查**：提供详细反馈，包括：
   - 逻辑正确性
   - 时间和空间复杂度
   - 边界情况处理
   - 代码可读性和最佳实践

### 📸 **截图支持**
不想手动输入题目？直接截图即可！CodeChecker 能够：
- 从图片中提取问题描述
- 从截图中解析代码（OCR）
- 处理混乱的输入格式

### ⚡ **实时进度追踪**
通过精美的三阶段流水线可视化工具，实时观察分析过程：
- 🔵 阶段 1：提取问题详情...
- 🔵 阶段 2：格式化代码...
- 🔵 阶段 3：运行深度分析...

### 📊 **可视化差异对比**
通过对比视图清晰看到原始代码和优化版本的差异：
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
   git clone https://github.com/your-username/code-checker.git
   cd code-checker
   docker-compose up -d
   ```

2. **在浏览器中打开**
   访问 [http://localhost:3000](http://localhost:3000)

3. **初始设置**
   首次启动时，需要配置：
   - 管理员账号
   - OpenAI API 密钥（或兼容的端点，如 Gemini）

### 方式 2：本地开发

1. **前置要求**
   - Node.js 20+
   - npm/yarn/pnpm

2. **安装与配置**
   ```bash
   git clone https://github.com/your-username/code-checker.git
   cd code-checker
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

1. **提交问题**
   - 选项 A：粘贴问题描述 + 你的代码
   - 选项 B：上传两者的截图

2. **等待分析**（约 30-60 秒）
   - 实时观察流水线处理你的请求

3. **查看结果**
   - **问题标签页**：查看结构化的问题分解
   - **代码标签页**：你的清洗/格式化后的代码
   - **差异标签页**：原始代码与优化版本的对比
   - **分析标签页**：每处修改的详细解释

4. **迭代优化**
   - 复制建议的改进
   - 用更新后的代码重试
   - 重复直到完美！

### 使用场景示例

**场景 1：调试超时问题（TLE）**
```
你的代码：暴力解法 O(n²)
→ CodeChecker 识别瓶颈
→ 建议 O(n log n) 方法并给出解释
→ 在差异视图中展示具体实现
```

**场景 2：捕获边界情况**
```
你的代码：仅适用于正整数
→ CodeChecker 根据题目约束测试
→ 发现在以下情况失败：负数、零、极大值
→ 提供处理所有情况的修复版本
```

**场景 3：学习更好的算法模式**
```
你的代码：混乱的嵌套循环
→ CodeChecker 识别滑动窗口模式
→ 重构为简洁、符合习惯的解法
→ 解释为什么更好（可读性 + 性能）
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

**贡献建议：**
- 支持更多编程语言
- 与 LeetCode/Codeforces API 集成
- 测试用例生成器
- 比赛模式（一次分析多个问题）

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

**祝你编程愉快！🎯** 如果 CodeChecker 帮助你在比赛中获胜或通过了棘手的测试用例，请给我们一个星标！⭐
