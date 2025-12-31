# CodeChecker Development Commands

.PHONY: help start stop restart logs clean build test

help: ## Show this help message
	@echo "CodeChecker - Available Commands"
	@echo "================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

start: ## Start all services
	@./deploy.sh

stop: ## Stop all services
	@echo "🛑 Stopping services..."
	@docker compose down

restart: ## Restart all services
	@echo "🔄 Restarting services..."
	@docker compose restart

logs: ## View application logs
	@docker compose logs -f code-checker

logs-all: ## View all services logs
	@docker compose logs -f

clean: ## Stop and remove all data (⚠️  destructive)
	@echo "⚠️  This will delete all database data!"
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ] && docker compose down -v || echo "Cancelled"

build: ## Rebuild Docker images
	@echo "🔨 Rebuilding images..."
	@docker compose build --no-cache

test: ## Run tests
	@docker compose exec code-checker npm test

db-migrate: ## Run database migrations
	@docker compose exec code-checker npx prisma migrate deploy

db-studio: ## Open Prisma Studio
	@docker compose exec code-checker npx prisma studio

status: ## Show service status
	@docker compose ps
