#!/bin/sh
set -e

# Run database migrations
echo "Running database migrations..."
npx drizzle-kit migrate

# Start the application
echo "Starting application..."
exec "$@"
