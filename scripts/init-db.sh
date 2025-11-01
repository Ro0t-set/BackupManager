#!/bin/bash

# Initialize the database with Alembic migrations

set -e

echo "🔄 Initializing database..."

cd backend

# Check if alembic is installed
if ! command -v alembic &> /dev/null; then
    echo "❌ Alembic not found. Please install requirements.txt first."
    exit 1
fi

# Run migrations
echo "Running migrations..."
alembic upgrade head

echo "✅ Database initialized successfully!"
