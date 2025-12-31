# Docker Deployment Architecture

## Service Stack

### code-checker (Next.js Application)
- **Port**: 3000 (exposed to host)
- **Memory**: ~500MB
- **Dependencies**: redis, postgres
- **Health**: Starts after dependencies are healthy

### postgres (PostgreSQL 16)
- **Port**: 5432 (internal only)
- **Memory Limit**: 200MB
- **Storage**: Persistent volume `postgres_data`
- **Credentials**: Configured via `DB_PASSWORD`

### redis (Redis 7)
- **Port**: 6379 (internal only)
- **Memory Limit**: 100MB
- **Storage**: Persistent volume `redis_data`
- **Purpose**: BullMQ task queue

---

## Environment Variables

### Required
- `OPENAI_API_KEY`: Your OpenAI API key
- `DB_PASSWORD`: PostgreSQL password
- `SETTINGS_TOKEN`: Admin panel access token

### Optional
- `OPENAI_BASE_URL`: Custom OpenAI endpoint (default: official API)
- `OPENAI_MODEL`: Model name (default: gpt-4o)
- `MAX_CONCURRENT_ANALYSIS_TASKS`: Worker concurrency (default: 3)
- `REQUEST_TIMEOUT_SECONDS`: GPT request timeout (default: 180)

---

## Network Architecture

```
┌─────────────────────────────────────┐
│           Docker Network            │
│                                     │
│  ┌──────────┐   ┌────────────────┐│
│  │ postgres │◀──│  code-checker  ││◀─── :3000 (Public)
│  └──────────┘   └────────────────┘│
│                         ▲          │
│                         │          │
│                  ┌──────────┐     │
│                  │  redis   │     │
│                  └──────────┘     │
└─────────────────────────────────────┘
```

Only port 3000 is exposed to the host. Database and Redis are completely isolated within the Docker network.

---

## Data Persistence

### Volumes
- `postgres_data`: PostgreSQL database files
- `redis_data`: Redis AOF persistence

### Backup Strategy
```bash
# Backup database
docker compose exec postgres pg_dump -U codechecker codechecker > backup.sql

# Restore database
cat backup.sql | docker compose exec -T postgres psql -U codechecker codechecker
```

---

## Resource Limits

Configured for 1GB VPS:

| Service | Memory Limit | Memory Reserve |
|---------|--------------|----------------|
| postgres | 200MB | 100MB |
| redis | 100MB | 50MB |
| code-checker | No limit* | - |

*Application uses remaining memory (~500MB on 1GB VPS)

---

## Scaling Considerations

### Horizontal Scaling
- Multiple workers: Increase `MAX_CONCURRENT_ANALYSIS_TASKS`
- Load balancer: Use nginx/haproxy in front of multiple containers

### Vertical Scaling
- Adjust memory limits in `docker-compose.yml`
- Monitor with `docker stats`

---

## Security

### Network Isolation
- Database and Redis are NOT exposed to internet
- Only application port (3000) is public
- Use reverse proxy (nginx/Caddy) for SSL

### Secrets Management
- Never commit `.env` to Git
- Use Docker secrets for production
- Rotate `SETTINGS_TOKEN` regularly

---

## Monitoring

### Health Checks
```bash
# Check all services
docker compose ps

# Test database
docker compose exec postgres pg_isready

# Test Redis
docker compose exec redis redis-cli ping
```

### Logs
```bash
# Application
docker compose logs -f code-checker

# All services
docker compose logs -f

# Specific timeframe
docker compose logs --since 1h
```

---

## Troubleshooting

### High Memory Usage
```bash
# Check stats
docker stats

# Restart specific service
docker compose restart code-checker

# Rebuild with clean cache
docker compose build --no-cache
```

### Database Issues
```bash
# Access PostgreSQL shell
docker compose exec postgres psql -U codechecker

# Check connections
docker compose exec postgres pg_stat_activity
```

### Redis Issues
```bash
# Access Redis CLI
docker compose exec redis redis-cli

# Check queue status
keys *
llen bull:code-analysis:*
```
