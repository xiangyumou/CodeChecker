#!/bin/sh
set -e

# Run database migrations
echo "Running database migrations..."
npx drizzle-kit migrate --config drizzle.config.ts

# Start the application
echo "Starting application..."
exec "$@"
