from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import get_password_hash
import os


def create_default_admin(db: Session):
    """Create default admin user if it doesn't exist"""
    admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    admin_username = os.getenv("ADMIN_USERNAME", "admin")

    # Check if admin already exists
    existing_admin = db.query(User).filter(
        (User.email == admin_email) | (User.is_admin == True)
    ).first()

    if existing_admin:
        print(f"Admin user already exists: {existing_admin.email}")
        return existing_admin

    # Create admin user
    admin_user = User(
        email=admin_email,
        username=admin_username,
        full_name="System Administrator",
        hashed_password=get_password_hash(admin_password),
        is_active=True,
        is_admin=True
    )

    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    print(f"✅ Default admin user created:")
    print(f"   Email: {admin_email}")
    print(f"   Password: {admin_password}")
    print(f"   ⚠️  CHANGE THE PASSWORD AFTER FIRST LOGIN!")

    return admin_user
