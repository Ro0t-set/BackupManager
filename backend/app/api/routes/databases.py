from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.encryption import encrypt_password, decrypt_password
from app.models.user import User
from app.models.database import Database
from app.models.group import Group
from app.models.backup import Backup, BackupStatus
from app.models.schedule import Schedule
# from app.models.backup_destination import BackupDestination, DestinationStatus  # OLD - removed
from app.schemas.database import (
    DatabaseCreate, 
    DatabaseUpdate, 
    DatabaseResponse, 
    DatabaseWithStats,
    DatabaseDetailResponse,
    ScheduleDetailItem,
    BackupDetailItem,
    BackupDestinationDetail,
    DestinationFileInfo
)
from app.utils.file_verification import verify_backup_file
from app.utils.database_connection import test_database_connection as test_db_conn

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


@router.get("/{database_id}/details", response_model=DatabaseDetailResponse)
def get_database_details(
    database_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get complete database details including:
    - Database information
    - All schedules with statistics
    - Recent backups (last 10) with file verification
    - Overall statistics
    """
    database = db.query(Database).filter(Database.id == database_id).first()
    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database not found"
        )

    # Get overall backup statistics
    total_backups = db.query(func.count(Backup.id)).filter(
        Backup.database_id == database_id
    ).scalar() or 0
    
    successful_backups = db.query(func.count(Backup.id)).filter(
        Backup.database_id == database_id,
        Backup.status == BackupStatus.COMPLETED
    ).scalar() or 0
    
    failed_backups = db.query(func.count(Backup.id)).filter(
        Backup.database_id == database_id,
        Backup.status == BackupStatus.FAILED
    ).scalar() or 0
    
    total_backup_size = db.query(func.sum(Backup.file_size)).filter(
        Backup.database_id == database_id,
        Backup.status == BackupStatus.COMPLETED
    ).scalar() or 0

    # Get all schedules with their statistics
    schedules_list = []
    for schedule in database.schedules:
        schedule_backups = db.query(func.count(Backup.id)).filter(
            Backup.schedule_id == schedule.id
        ).scalar() or 0
        
        schedule_successful = db.query(func.count(Backup.id)).filter(
            Backup.schedule_id == schedule.id,
            Backup.status == BackupStatus.COMPLETED
        ).scalar() or 0
        
        schedule_failed = db.query(func.count(Backup.id)).filter(
            Backup.schedule_id == schedule.id,
            Backup.status == BackupStatus.FAILED
        ).scalar() or 0
        
        schedule_item = ScheduleDetailItem(
            id=schedule.id,
            name=schedule.name,
            description=schedule.description,
            schedule_type=schedule.schedule_type.value,
            cron_expression=schedule.cron_expression,
            interval_value=schedule.interval_value,
            retention_days=schedule.retention_days,
            max_backups=schedule.max_backups,
            is_active=schedule.is_active,
            last_run_at=schedule.last_run_at,
            next_run_at=schedule.next_run_at,
            created_at=schedule.created_at,
            updated_at=schedule.updated_at,
            total_backups=schedule_backups,
            successful_backups=schedule_successful,
            failed_backups=schedule_failed
        )
        schedules_list.append(schedule_item)

    # Get last 10 backups with file verification for all destinations
    recent_backups_query = db.query(Backup).filter(
        Backup.database_id == database_id
    ).order_by(desc(Backup.created_at)).limit(10).all()
    
    recent_backups_list = []
    for backup in recent_backups_query:
        # Get all destinations for this backup (legacy, kept for backward compatibility)
        destinations_list = []

        backup_item = BackupDetailItem(
            id=backup.id,
            name=backup.name,
            database_id=backup.database_id,
            schedule_id=backup.schedule_id,
            status=backup.status.value,
            error_message=backup.error_message,
            started_at=backup.started_at,
            completed_at=backup.completed_at,
            duration_seconds=backup.duration_seconds,
            created_at=backup.created_at,
            is_compressed=backup.is_compressed,
            compression_type=backup.compression_type,
            destinations=destinations_list,
            destination_results=backup.destination_results,  # Include multi-destination results JSON
            # Legacy fields for backward compatibility
            storage_type=backup.storage_type.value if backup.storage_type else None,
            file_path=backup.file_path,
            file_size=backup.file_size
        )
        recent_backups_list.append(backup_item)

    # Get group name
    group_name = database.group.name if database.group else None

    # Build response
    response_data = {
        **database.__dict__,
        "total_backups": total_backups,
        "successful_backups": successful_backups,
        "failed_backups": failed_backups,
        "total_backup_size": total_backup_size,
        "schedules": schedules_list,
        "recent_backups": recent_backups_list,
        "group_name": group_name
    }

    return DatabaseDetailResponse(**response_data)


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

    # Update fields - use Pydantic v2 syntax
    update_data = database_data.model_dump(exclude_unset=True)

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
    """Test database connection for an existing database"""
    database = db.query(Database).filter(Database.id == database_id).first()
    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database not found"
        )

    # Decrypt password
    decrypted_password = decrypt_password(database.password)
    
    # Test connection
    success, message = test_db_conn(
        db_type=database.db_type.value,
        host=database.host,
        port=database.port,
        username=database.username,
        password=decrypted_password,
        database=database.database_name
    )
    
    return {
        "success": success,
        "message": message,
        "db_type": database.db_type.value,
        "host": database.host,
        "port": database.port
    }


@router.post("/test-connection", status_code=status.HTTP_200_OK)
def test_new_database_connection(
    connection_data: DatabaseCreate,
    current_user: User = Depends(get_current_user)
):
    """Test database connection with provided credentials (before saving)"""
    # Test connection without saving to database
    success, message = test_db_conn(
        db_type=connection_data.db_type.value,
        host=connection_data.host,
        port=connection_data.port,
        username=connection_data.username,
        password=connection_data.password,  # Plain password from form
        database=connection_data.database_name
    )
    
    return {
        "success": success,
        "message": message,
        "db_type": connection_data.db_type.value,
        "host": connection_data.host,
        "port": connection_data.port
    }
