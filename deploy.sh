#!/bin/bash
set -e

echo "🐳 CodeChecker - Docker Deployment"
echo "===================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your configuration."
    echo ""
    echo "Required settings:"
    echo "  - OPENAI_API_KEY"
    echo "  - DB_PASSWORD"
    echo "  - SETTINGS_TOKEN"
    echo ""
    read -p "Press Enter to continue after editing .env, or Ctrl+C to exit..."
fi

echo "🚀 Starting services..."
docker compose up -d --build

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check service status
if docker compose ps | grep -q "Up"; then
    echo ""
    echo "✅ Services started successfully!"
    echo ""
    echo "📊 Service Status:"
    docker compose ps
    echo ""
    echo "🌐 Application: http://localhost:3000"
    echo ""
    echo "📝 Useful commands:"
    echo "  View logs:    docker compose logs -f"
    echo "  Stop:         docker compose down"
    echo "  Restart:      docker compose restart"
    echo "  Clean DB:     docker compose down -v"
else
    echo ""
    echo "❌ Some services failed to start. Check logs:"
    echo "   docker compose logs"
    exit 1
fi
