# CodeChecker

AI 驱动的 ACM/OI 竞赛编程代码调试工具。

[![Docker](https://img.shields.io/badge/Docker-Required-blue)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 快速开始

> **重要：** 本项目仅支持 Docker 部署。

### 前置要求
- Docker 20.10+
- Docker Compose V2

### 1. 克隆并配置
```bash
git clone https://github.com/xiangyumou/CodeChecker.git
cd CodeChecker

cp .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY 和 SETTINGS_TOKEN
```

### 2. 启动
```bash
make start
```

### 3. 访问
打开 http://localhost:3000

---

## 功能特性

- **代码分析** - 提交代码和问题描述，AI 自动分析 Bug
- **图片支持** - 可上传题目截图（最多 5 张）
- **修复建议** - 提供代码修复和详细解释
- **对比视图** - 并排显示原始代码和修复后代码

---

## 配置说明

| 变量 | 描述 | 必需 |
|------|------|------|
| `OPENAI_API_KEY` | OpenAI API 密钥 | 是 |
| `OPENAI_BASE_URL` | API 端点 | 否 |
| `OPENAI_MODEL` | 模型名称（默认：gpt-4o） | 否 |
| `SETTINGS_TOKEN` | 管理面板访问令牌 | 是 |

---

## 常用命令

```bash
make start    # 启动服务
make stop     # 停止服务
make logs     # 查看日志
make clean    # 清理数据（⚠️ 危险）
```

---

## 技术栈

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS + Radix UI
- Drizzle ORM + SQLite
- OpenAI API

---

## 许可证

MIT License
