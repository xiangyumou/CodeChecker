#!/bin/sh
set -e

# Run database migrations
echo "Running database migrations..."
npx prisma@5.22.0 migrate deploy

# Start the application
echo "Starting application..."
exec "$@"
