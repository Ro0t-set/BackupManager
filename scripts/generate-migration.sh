#!/bin/bash

# Generate a new Alembic migration

if [ -z "$1" ]; then
    echo "Usage: ./scripts/generate-migration.sh <migration_name>"
    exit 1
fi

MIGRATION_NAME=$1

echo "📝 Generating migration: $MIGRATION_NAME"

cd backend

alembic revision --autogenerate -m "$MIGRATION_NAME"

echo "✅ Migration generated successfully!"
echo "Review the migration file in backend/alembic/versions/"
echo "Then run: ./scripts/init-db.sh to apply it"
