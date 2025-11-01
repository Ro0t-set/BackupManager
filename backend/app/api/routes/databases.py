from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.encryption import encrypt_password, decrypt_password
from app.models.user import User
from app.models.database import Database
from app.models.group import Group
from app.models.backup import Backup, BackupStatus
from app.schemas.database import DatabaseCreate, DatabaseUpdate, DatabaseResponse, DatabaseWithStats

router = APIRouter()


@router.get("/", response_model=List[DatabaseResponse])
def list_databases(
    group_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all databases, optionally filtered by group"""
    query = db.query(Database)

    if group_id:
        query = query.filter(Database.group_id == group_id)

    databases = query.offset(skip).limit(limit).all()
    return databases


@router.get("/{database_id}", response_model=DatabaseWithStats)
def get_database(
    database_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific database by ID with statistics"""
    database = db.query(Database).filter(Database.id == database_id).first()
    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database not found"
        )

    # Get statistics
    total_backups = db.query(func.count(Backup.id)).filter(Backup.database_id == database_id).scalar()
    total_schedules = len(database.schedules)

    # Get last backup status
    last_backup = db.query(Backup).filter(
        Backup.database_id == database_id
    ).order_by(Backup.created_at.desc()).first()

    last_backup_status = last_backup.status.value if last_backup else None

    # Total backup size
    total_size = db.query(func.sum(Backup.file_size)).filter(
        Backup.database_id == database_id,
        Backup.status == BackupStatus.COMPLETED
    ).scalar() or 0

    # Convert to dict and add stats
    db_dict = {
        **database.__dict__,
        "total_backups": total_backups,
        "total_schedules": total_schedules,
        "last_backup_status": last_backup_status,
        "total_backup_size": total_size
    }

    return DatabaseWithStats(**db_dict)


@router.post("/", response_model=DatabaseResponse, status_code=status.HTTP_201_CREATED)
def create_database(
    database_data: DatabaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new database connection"""
    # Check if group exists
    group = db.query(Group).filter(Group.id == database_data.group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # Encrypt password if provided
    encrypted_password = None
    if database_data.password:
        encrypted_password = encrypt_password(database_data.password)

    # Create new database
    new_database = Database(
        name=database_data.name,
        description=database_data.description,
        db_type=database_data.db_type,
        host=database_data.host,
        port=database_data.port,
        username=database_data.username,
        password_encrypted=encrypted_password,
        database_name=database_data.database_name,
        connection_options=database_data.connection_options,
        group_id=database_data.group_id,
        created_by=current_user.id,
        is_active=True
    )

    db.add(new_database)
    db.commit()
    db.refresh(new_database)

    return new_database


@router.put("/{database_id}", response_model=DatabaseResponse)
def update_database(
    database_id: int,
    database_data: DatabaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a database connection"""
    database = db.query(Database).filter(Database.id == database_id).first()
    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database not found"
        )

    # Check permissions
    if database.created_by != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this database"
        )

    # Update fields
    update_data = database_data.dict(exclude_unset=True)

    # Handle password encryption
    if "password" in update_data and update_data["password"]:
        update_data["password_encrypted"] = encrypt_password(update_data["password"])
        del update_data["password"]

    for field, value in update_data.items():
        setattr(database, field, value)

    db.commit()
    db.refresh(database)

    return database


@router.delete("/{database_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_database(
    database_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a database connection"""
    database = db.query(Database).filter(Database.id == database_id).first()
    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database not found"
        )

    # Check permissions
    if database.created_by != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this database"
        )

    db.delete(database)
    db.commit()

    return None


@router.post("/{database_id}/test", status_code=status.HTTP_200_OK)
def test_database_connection(
    database_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Test database connection"""
    database = db.query(Database).filter(Database.id == database_id).first()
    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database not found"
        )

    # TODO: Implement actual connection test based on db_type
    # For now, return a success message
    return {
        "success": True,
        "message": f"Connection test for {database.name} would be performed here",
        "db_type": database.db_type.value
    }
