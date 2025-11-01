#!/bin/bash

# Run frontend linter

set -e

echo "🔍 Running ESLint..."

cd frontend

npm run lint

echo "✅ Linting completed!"
