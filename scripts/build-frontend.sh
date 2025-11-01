#!/bin/bash

# Build frontend for production

set -e

echo "🏗️  Building frontend..."

cd frontend

# Install dependencies
npm ci

# Build
npm run build

echo "✅ Build completed!"
echo "📦 Build output in frontend/dist/"
