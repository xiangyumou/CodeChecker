# CodeChecker

AI-powered code analysis and optimization tool with staged GPT evaluation.

[![Docker](https://img.shields.io/badge/Docker-Required-blue)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🚀 Quick Start (Docker Required)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) V2

### 1. Clone and Configure
```bash
git clone https://github.com/xiangyumou/CodeChecker.git
cd CodeChecker

# Copy environment template
cp .env.example .env

# Edit configuration (required)
nano .env  # or use your preferred editor
```

### 2. Deploy
```bash
# Simple one-command deployment
./deploy.sh

# Or using Make
make start
```

### 3. Access
Open http://localhost:3000

---

## 📋 Common Commands

```bash
make help          # Show all available commands
make logs          # View application logs
make restart       # Restart services
make stop          # Stop all services
make clean         # Remove all data (⚠️ destructive)
```

---

## ⚙️ Configuration

Edit `.env` file:

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_PASSWORD` | PostgreSQL password | ✅ |
| `OPENAI_API_KEY` | OpenAI API key | ✅ |
| `OPENAI_BASE_URL` | Custom OpenAI endpoint | Optional |
| `SETTINGS_TOKEN` | Admin panel token | ✅ |
| `MAX_CONCURRENT_ANALYSIS_TASKS` | Worker concurrency | Optional (default: 3) |

**Note:** PostgreSQL is the only officially supported database.

---

## 🏗️ Architecture

```
┌────────────┐     ┌──────────┐     ┌────────────┐
│   Next.js  │────▶│  BullMQ  │────▶│   Worker   │
│  (Web UI)  │     │  (Redis) │     │  (GPT API) │
└────────────┘     └──────────┘     └────────────┘
       │                                    │
       └──────────┬────────────────────────┘
                  │
            ┌──────────┐
            │PostgreSQL│
            └──────────┘
```

**Services:**
- `code-checker`: Next.js application (Port 3000)
- `postgres`: PostgreSQL 16 database
- `redis`: Redis 7 for task queue

**Resource Usage (1GB VPS):**
- PostgreSQL: ~200MB
- Redis: ~30MB
- Application: ~500MB
- **Total: ~730MB** ✅

---

## 🔧 Development

### Running Tests
```bash
make test
```

### Database Management
```bash
make db-migrate    # Run migrations
make db-studio     # Open Prisma Studio
```

### Viewing Logs
```bash
make logs          # App only
make logs-all      # All services
```

---

## 📦 Production Deployment

### Option 1: VPS with Docker (Recommended)
1. Follow Quick Start on your VPS
2. Configure domain and SSL (nginx/Caddy)
3. Set environment variables for production

### Option 2: CI/CD with GitHub Actions
See [CI/CD Setup Guide](docs/cicd-setup.md) for automated deployments.

---

## 🐛 Troubleshooting

**Services won't start:**
```bash
# Check Docker status
docker ps

# View detailed logs
docker compose logs

# Clean restart
make clean && make start
```

**Out of memory (VPS):**
- Ensure swap is configured
- Check `docker-compose.yml` memory limits
- Consider upgrading VPS plan

**Database connection errors:**
- Verify PostgreSQL is healthy: `docker compose ps`
- Check `DATABASE_URL` in `.env`

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Test with Docker
4. Submit a pull request

---

**Note:** This project officially supports **Docker deployment only**. Development without Docker is not officially supported.
