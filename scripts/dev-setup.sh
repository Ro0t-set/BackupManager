#!/bin/bash

# Complete development environment setup

set -e

echo "🚀 Setting up BackupManager development environment..."
echo ""

# Check prerequisites
echo "1️⃣  Checking prerequisites..."
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
echo "✅ Prerequisites OK"
echo ""

# Setup backend
echo "2️⃣  Setting up backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env

    # Generate keys
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

    # Update .env
    sed -i.bak "s|SECRET_KEY=.*|SECRET_KEY=$SECRET_KEY|g" .env
    sed -i.bak "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|g" .env
    rm .env.bak

    echo "✅ Generated SECRET_KEY and ENCRYPTION_KEY"
fi

cd ..
echo "✅ Backend setup complete"
echo ""

# Setup frontend
echo "3️⃣  Setting up frontend..."
cd frontend

echo "Installing dependencies..."
npm install

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi

cd ..
echo "✅ Frontend setup complete"
echo ""

# Create backup directory
echo "4️⃣  Creating backup directory..."
mkdir -p backups
touch backups/.gitkeep
echo "✅ Backup directory created"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Backend: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "  2. Frontend: cd frontend && npm run dev"
echo ""
echo "Or use Docker:"
echo "  docker-compose -f docker-compose.dev.yml up"
