#!/bin/sh
set -e

# Run migrations
echo "Runnning database migrations..."
npx -y prisma@5.22.0 migrate deploy

# Start the application
echo "Starting application..."
exec "$@"
