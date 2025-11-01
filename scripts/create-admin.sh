#!/bin/bash

# Create an admin user

set -e

echo "👤 Creating admin user..."

cd backend

# Default credentials (change in production!)
DEFAULT_EMAIL="admin@backupmanager.local"
DEFAULT_PASSWORD="admin123"

echo "This script will create an admin user with default credentials:"
echo "Email: $DEFAULT_EMAIL"
echo "Password: $DEFAULT_PASSWORD"
echo ""
echo "⚠️  Remember to change the password after first login!"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Run Python script to create admin
python3 << EOF
import sys
sys.path.insert(0, '.')

from app.database import SessionLocal, engine
from app.models.user import User
from app.core.security import get_password_hash

# Create user
db = SessionLocal()
try:
    # Check if admin exists
    existing = db.query(User).filter(User.email == "$DEFAULT_EMAIL").first()
    if existing:
        print("❌ Admin user already exists!")
        sys.exit(1)

    # Create admin user
    admin = User(
        email="$DEFAULT_EMAIL",
        hashed_password=get_password_hash("$DEFAULT_PASSWORD"),
        is_active=True,
        is_superuser=True
    )
    db.add(admin)
    db.commit()
    print("✅ Admin user created successfully!")
except Exception as e:
    print(f"❌ Error creating admin: {e}")
    sys.exit(1)
finally:
    db.close()
EOF
