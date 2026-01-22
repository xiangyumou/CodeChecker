# CodeChecker

AI-powered code debugging tool for ACM/OI competitive programming.

[![Docker](https://img.shields.io/badge/Docker-Required-blue)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Quick Start (Docker Required)

> **Important:** Docker deployment is the only officially supported method.

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

## Features

### Code Analysis
- Submit problem descriptions via text or images
- Upload up to 5 images (JPG/PNG, 2MB each)
- Drag & drop or paste images from clipboard
- Real-time status updates (5-second polling)

### Three-Stage Analysis Pipeline
1. **Problem Extraction** - Extract structured problem details from text/images (title, constraints, samples)
2. **Code Formatting** - Clean and structure submitted code
3. **Deep Analysis** - Identify bugs and suggest fixes with explanations

### Results Display
- Structured problem details (title, time/memory limits, description, samples)
- Syntax-highlighted source code with copy functionality
- Side-by-side diff visualization (original vs. modified code)
- Detailed modification analysis explaining each fix

### Settings Panel (`/settings`)
- Token-based admin authentication (via `SETTINGS_TOKEN`)
- General settings:
  - OpenAI API key and base URL
  - Model selection (default: gpt-4o)
  - Vision support toggle
  - Max concurrent tasks (default: 3)
  - Request timeout (default: 180 seconds)
- Prompt customization for each analysis stage
- Data management:
  - Delete individual requests
  - Prune old requests (by time: minutes, hours, days, months)
  - Clear all data

### Internationalization
- English (en)
- Chinese (zh)
- German (de)

### Theme Support
- Dark mode toggle
- Light mode toggle
- System preference detection

---

## How It Works

1. **Submit** your code and problem description (text or images)
2. **Queue** - The request enters a BullMQ queue (Redis-backed)
3. **Process** - Background worker processes through three stages:
   - Stage 1 & 2 run in parallel (problem extraction + code formatting)
   - Stage 3 uses results from stages 1 & 2 for deep analysis
4. **Store** - Results are saved to PostgreSQL
5. **Display** - UI polls for status updates every 5 seconds

---

## Usage

### Submitting an Analysis Request

1. Navigate to the home page
2. Enter problem description in the text area
3. (Optional) Upload up to 5 images via:
   - Click to upload
   - Drag & drop
   - Paste from clipboard (Ctrl+V)
4. Click "Submit" to start analysis

### Viewing Results

- Click on any request in the sidebar to view details
- Results are displayed in four tabs:
  - **Problem** - Structured problem details (title, limits, description, samples)
  - **Code** - Formatted source code with syntax highlighting
  - **Diff** - Side-by-side comparison of original vs. modified code
  - **Analysis** - Detailed explanations for each modification

### Retrying Failed Requests

If an analysis fails, you can retry it from the request detail page.

### Accessing Settings

1. Navigate to `/settings`
2. Enter your `SETTINGS_TOKEN` for authentication
3. Configure:
  - OpenAI API settings
  - Model selection and concurrency
  - Custom prompts for each stage
  - Data management (delete/prune requests)

---

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| **Database** | | | |
| `DB_PROVIDER` | Database provider | Yes | `postgresql` |
| `DB_USER` | Database user | Yes | `codechecker` |
| `DB_PASSWORD` | Database password | Yes | - |
| `DB_HOST` | Database host | Yes | `postgres` |
| `DB_PORT` | Database port | Yes | `5432` |
| `DB_NAME` | Database name | Yes | `codechecker` |
| **OpenAI** | | | |
| `OPENAI_API_KEY` | OpenAI API key | Yes | - |
| `OPENAI_BASE_URL` | API endpoint | No | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | Model name | No | `gpt-4o` |
| `MODEL_SUPPORTS_VISION` | Enable image support | No | `true` |
| **Queue** | | | |
| `MAX_CONCURRENT_ANALYSIS_TASKS` | Worker concurrency | No | `3` |
| `REQUEST_TIMEOUT_SECONDS` | Request timeout | No | `180` |
| **Other** | | | |
| `NEXT_PUBLIC_APP_URL` | Application URL | Yes | `http://localhost:3000` |
| `SETTINGS_TOKEN` | Admin panel token | Yes | - |
| `LOG_LEVEL` | Logging level | No | `info` |
| `LOG_PRETTY` | Pretty print logs | No | `false` |
| `REDIS_HOST` | Redis host | Yes | `redis` |
| `REDIS_PORT` | Redis port | Yes | `6379` |

> **Database Support:**
> PostgreSQL is the **only officially supported and tested** database.
> While other databases may technically work, they are not supported.

---

## Common Commands

```bash
make help          # Show all available commands
make logs          # View application logs
make logs-all      # View all service logs
make restart       # Restart services
make stop          # Stop all services
make clean         # Remove all data (⚠️ destructive)
```

---

## Architecture

### Services

| Service | Description | Port | Memory |
|---------|-------------|------|--------|
| `code-checker` | Next.js application | 3000 | ~500MB |
| `postgres` | PostgreSQL 16 database | 5432 | ~200MB |
| `redis` | Redis 7 for BullMQ queue | 6379 | ~30MB |

**Total: ~730MB** (fits on 1GB VPS)

### Tech Stack

**Frontend:**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Radix UI components
- Framer Motion (animations)
- Zustand (state management)

**Backend:**
- tRPC (type-safe RPC)
- Prisma ORM
- BullMQ (Redis-backed task queue)
- bcrypt (password hashing)
- Pino (logging)

**Database:**
- PostgreSQL 16 (only supported database)

**Testing:**
- Vitest (unit tests)
- Playwright (E2E tests)

### Task Processing

- **Queue:** BullMQ with Redis
- **Worker Concurrency:** Configurable (default: 3)
- **Retry Strategy:** 3 attempts with exponential backoff (2s, 4s, 8s)
- **Job Retention:** 100 successful jobs (24h), 200 failed jobs (7 days)

---

## Development

> **Note:** Docker deployment is the only officially supported method. Local development setup is not documented or supported.

### Running Tests

#### Unit Tests
```bash
npm test           # Run all unit tests
npm run test:watch # Run in watch mode
```

#### E2E Tests (Playwright)

First, install Playwright browsers:
```bash
npx playwright install
```

Then run the tests:
```bash
npm run test:e2e:smoke  # Basic UI tests (no API required)
npm run test:e2e:full   # Full analysis flow (requires OPENAI_API_KEY)
npm run test:e2e        # All E2E tests
npm run test:e2e:ui     # Interactive Playwright UI
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

## Troubleshooting

### Services won't start
```bash
# Check Docker status
docker compose ps

# View detailed logs
docker compose logs

# Clean restart
make clean && make start
```

### Out of memory (VPS)
- Ensure swap is configured
- Check memory limits in `docker-compose.yml`
- Minimum recommendation: 1GB RAM

### Database connection errors
- Verify PostgreSQL is healthy: `docker compose ps`
- Check `DATABASE_URL` in `.env`
- Ensure database is initialized: `make db-migrate`

### Analysis stuck in queue
- Check Redis is running: `docker compose ps`
- Verify `MAX_CONCURRENT_ANALYSIS_TASKS` setting
- Check worker logs: `docker compose logs -f code-checker`

---

## Production Deployment

### VPS with Docker (Recommended)

1. Follow Quick Start on your VPS
2. Configure domain and SSL (nginx/Caddy)
3. Set production environment variables

### CI/CD with GitHub Actions

See [CI/CD Setup Guide](docs/cicd-setup.md) for automated deployments.

**GitHub Secrets for deployment:**
- `VPS_HOST` - VPS hostname/IP
- `VPS_USERNAME` - SSH username
- `VPS_SSH_KEY` - SSH private key
- `VPS_PORT` - SSH port (default: 22)

---

## Security

- Token-based admin authentication (`SETTINGS_TOKEN`)
- Password hashing with bcrypt
- No user account system (stateless)
- No data retention beyond analysis results

---

## License

MIT License - see [LICENSE](LICENSE) file

---

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Test with Docker
4. Submit a pull request

---

**Note:** This project officially supports **Docker deployment only**.
