# CI/CD 完整配置指南

## 概述

这套 CI/CD 流水线会自动完成：
1. **CI (持续集成)**：运行测试 → 构建 Docker 镜像 → 推送到 GitHub Container Registry
2. **CD (持续部署)**：SSH 登录 VPS → 拉取最新镜像 → 重启服务

---

## 第一步：在 GitHub 配置 Secrets

进入你的 GitHub 仓库页面：
1. 点击 **Settings** (设置)
2. 左侧菜单找到 **Secrets and variables** → **Actions**
3. 点击 **New repository secret** 添加以下密钥：

### 需要配置的 Secrets

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `VPS_HOST` | `你的VPS公网IP` | 例如：`123.45.67.89` |
| `VPS_USERNAME` | `root` 或你的用户名 | SSH 登录用户名 |
| `VPS_SSH_KEY` | `你的SSH私钥` | 见下文生成方法 |
| `VPS_PORT` | `22` | SSH 端口（默认 22） |
| `GHCR_TOKEN` | 不需要！ | GitHub 自动提供 |

---

## 第二步：生成并配置 SSH 密钥

### 在你的本地电脑上执行：

```bash
# 生成新的 SSH 密钥对（专门给 CI/CD 用）
ssh-keygen -t ed25519 -C "github-actions@codechecker" -f ~/.ssh/github_actions_deploy

# 这会生成两个文件：
# - github_actions_deploy      (私钥，给 GitHub)
# - github_actions_deploy.pub  (公钥，给 VPS)
```

### 复制私钥内容到 GitHub Secrets：

```bash
# macOS:
cat ~/.ssh/github_actions_deploy | pbcopy

# Linux:
cat ~/.ssh/github_actions_deploy

# 然后把输出的全部内容（从 -----BEGIN 到 -----END）
# 粘贴到 GitHub Secret VPS_SSH_KEY 中
```

### 把公钥添加到 VPS：

```bash
# 复制公钥内容
cat ~/.ssh/github_actions_deploy.pub

# SSH 登录到你的 VPS
ssh root@你的VPS_IP

# 在 VPS 上执行
mkdir -p ~/.ssh
echo "刚才复制的公钥内容" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### 测试 SSH 连接：

```bash
# 在本地测试能否用私钥登录 VPS
ssh -i ~/.ssh/github_actions_deploy root@你的VPS_IP

# 如果能成功登录，说明配置正确
```

---

## 第三步：VPS 上的准备工作

### 1. 确保 Docker 和 Docker Compose 已安装

```bash
# 检查版本
docker --version
docker compose version
```

### 2. 登录到 GitHub Container Registry

```bash
# 在 VPS 上执行
echo "你的GitHub_PAT" | docker login ghcr.io -u 你的GitHub用户名 --password-stdin
```

> **如何获取 GitHub Personal Access Token (PAT)**：
> 1. GitHub 右上角头像 → **Settings** → **Developer settings**
> 2. **Personal access tokens** → **Tokens (classic)** → **Generate new token**
> 3. 勾选权限：`read:packages`、`write:packages`
> 4. 生成后复制 token（只显示一次！）

### 3. 创建项目目录

```bash
# 在 VPS 上创建部署目录
mkdir -p /opt/codechecker
cd /opt/codechecker

# 创建必要的文件
touch .env docker-compose.yml
```

### 4. 配置 VPS 上的 `docker-compose.yml`

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    mem_limit: 100m
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  postgres:
    image: postgres:16-alpine
    container_name: postgres
    restart: unless-stopped
    mem_limit: 200m
    environment:
      POSTGRES_USER: codechecker
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: codechecker
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "codechecker"]
      interval: 10s
      timeout: 3s
      retries: 3

  code-checker:
    # 关键！使用 GHCR 镜像，不再本地构建
    image: ghcr.io/xiangyumou/codechecker:latest
    container_name: code-checker
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - DB_PROVIDER=postgresql
      - DATABASE_URL=postgresql://codechecker:${DB_PASSWORD}@postgres:5432/codechecker
    env_file:
      - .env
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy

volumes:
  redis_data:
  postgres_data:
```

### 5. 配置 VPS 上的 `.env`

```bash
# /opt/codechecker/.env
DB_PASSWORD=你的数据库密码

# OpenAI 配置
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://llm.xiangyu.pro/v1
OPENAI_MODEL=gemini-3-flash-preview

# 其他配置
MAX_CONCURRENT_ANALYSIS_TASKS=3
SETTINGS_TOKEN=你的管理员token
NEXT_PUBLIC_APP_URL=https://code.xiangyu.pro
```

---

## 第四步：更新本地的 `docker-compose.yml`

> **重要**：你本地的 `docker-compose.yml` 保持 `build: .` 用于本地开发。
> 
> VPS 上的 `docker-compose.yml` 使用 `image: ghcr.io/...` 直接拉取镜像。

---

## 第五步：工作流文件已创建

我已经创建了 `.github/workflows/deploy.yml`，它会在你 push 到 `main` 分支时自动执行。

---

## 使用方法

### 自动部署
```bash
# 本地完成开发后
git add .
git commit -m "feat: 新功能"
git push origin main

# GitHub Actions 自动执行：
# 1. 运行测试
# 2. 构建 Docker 镜像
# 3. 推送到 ghcr.io
# 4. SSH 到 VPS 并部署
```

### 手动部署（在 VPS 上）
```bash
cd /opt/codechecker
docker compose pull
docker compose up -d
docker image prune -f
```

---

## 监控和调试

### 查看 GitHub Actions 执行状态
1. 进入你的仓库
2. 点击顶部 **Actions** 标签
3. 可以看到每次 push 触发的 workflow 执行情况

### 查看 VPS 日志
```bash
# 查看应用日志
docker compose logs -f code-checker

# 查看所有服务状态
docker compose ps

# 重启服务
docker compose restart code-checker
```

---

## 常见问题

### Q1: SSH 连接失败
检查：
- VPS 防火墙是否允许 22 端口
- SSH 公钥是否正确添加到 VPS 的 `~/.ssh/authorized_keys`
- GitHub Secret 中的私钥是否完整（包含 BEGIN 和 END）

### Q2: 镜像拉取失败
检查：
- VPS 是否已登录 `ghcr.io`（执行 `docker login ghcr.io`）
- GitHub PAT 是否有 `read:packages` 权限
- 镜像名称是否正确（用户名大小写）

### Q3: 测试失败导致部署中断
这是正常的！CI/CD 的目的就是保护生产环境：
- 在 Actions 页面查看哪个测试失败
- 修复后重新 push

---

## 资源占用

| 步骤 | 在哪执行 | 内存占用 |
|------|---------|---------|
| 测试 | GitHub Actions | 0 (免费) |
| 构建镜像 | GitHub Actions | 0 (免费) |
| 拉取镜像 | VPS | ~50MB |
| 运行应用 | VPS | ~500MB |
| **总计** | VPS | **~750MB** ✅ |

你的 1GB VPS 绰绰有余！
