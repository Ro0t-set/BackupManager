#!/bin/bash

# Run backend tests

set -e

echo "🧪 Running backend tests..."

cd backend

# Install test dependencies if needed
pip install pytest pytest-cov pytest-asyncio httpx

# Run tests with coverage
pytest tests/ -v --cov=app --cov-report=html --cov-report=term

echo "✅ Tests completed!"
echo "📊 Coverage report generated in backend/htmlcov/index.html"
