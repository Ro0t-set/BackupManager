from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import os
import shutil
import json
from datetime import datetime

from app.core.database import get_db, SessionLocal
from app.core.deps import get_current_user
from app.models.user import User
from app.models.database import Database
from app.models.backup import Backup, BackupStatus
from app.models.database_destination import DatabaseDestination
from app.utils.backup_executor import (
    create_database_dump,
    copy_to_destinations,
    determine_backup_status
)

router = APIRouter()


def execute_backup_task(backup_id: int, database_id: int):
    """Background task to execute the backup"""
    db = SessionLocal()
    try:
        backup = db.query(Backup).filter(Backup.id == backup_id).first()
        database = db.query(Database).filter(Database.id == database_id).first()

        if not backup or not database:
            return

        # Update status to IN_PROGRESS
        backup.status = BackupStatus.IN_PROGRESS
        backup.started_at = datetime.utcnow()
        db.commit()

        # Get enabled destinations
        destinations = db.query(DatabaseDestination).filter(
            DatabaseDestination.database_id == database_id,
            DatabaseDestination.enabled == True
        ).all()

        # Step 1: Create database dump
        success, dump_file, error_msg = create_database_dump(
            db_type=database.db_type.value,
            host=database.host,
            port=database.port,
            username=database.username,
            password_encrypted=database.password_encrypted,
            database_name=database.database_name,
            backup_name=backup.name
        )

        if not success:
            backup.status = BackupStatus.FAILED
            backup.error_message = error_msg
            backup.completed_at = datetime.utcnow()
            db.commit()
            return

        # Get file size
        file_size = os.path.getsize(dump_file)
        backup.file_size = file_size

        # Step 2: Copy to all destinations
        project_name = database.group.name if database.group else "default"
        destination_results = copy_to_destinations(
            source_file=dump_file,
            destinations=destinations,
            project_name=project_name,
            database_name=database.name
        )

        # Step 3: Determine final status
        final_status = determine_backup_status(destination_results)
        backup.status = BackupStatus[final_status.upper()]
        backup.destination_results = json.dumps(destination_results)
        backup.completed_at = datetime.utcnow()

        if backup.started_at:
            duration = (backup.completed_at - backup.started_at).total_seconds()
            backup.duration_seconds = int(duration)

        # Cleanup temp file
        try:
            os.remove(dump_file)
        except:
            pass

        db.commit()

    except Exception as e:
        if backup:
            backup.status = BackupStatus.FAILED
            backup.error_message = f"Backup execution failed: {str(e)}"
            backup.completed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


class ManualBackupRequest(BaseModel):
    database_id: int


@router.post("/manual")
async def trigger_manual_backup(
    request: ManualBackupRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trigger a manual backup for a database.
    Uses the database's configured destinations.
    """
    database_id = request.database_id
    database = db.query(Database).filter(Database.id == database_id).first()
    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database not found"
        )

    # Get enabled destinations
    destinations = db.query(DatabaseDestination).filter(
        DatabaseDestination.database_id == database_id,
        DatabaseDestination.enabled == True
    ).all()

    if not destinations or len(destinations) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No backup destinations configured. Please add at least one destination first."
        )

    # Create backup record
    backup_name = f"{database.name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    new_backup = Backup(
        name=backup_name,
        database_id=database_id,
        schedule_id=None,  # Manual backup
        status=BackupStatus.PENDING,
        created_by=current_user.id,
        is_compressed=True
    )

    db.add(new_backup)
    db.commit()
    db.refresh(new_backup)

    # Execute backup in background task
    background_tasks.add_task(execute_backup_task, new_backup.id, database_id)

    return {
        "message": "Backup started",
        "backup_id": new_backup.id,
        "backup_name": backup_name,
        "destinations": [dest.path for dest in destinations],
        "status": "in_progress"
    }


@router.get("/")
async def list_backups(
    database_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all backups, optionally filtered by database"""
    query = db.query(Backup)

    if database_id:
        query = query.filter(Backup.database_id == database_id)

    backups = query.order_by(Backup.created_at.desc()).offset(skip).limit(limit).all()
    return backups


@router.get("/{backup_id}")
async def get_backup(
    backup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific backup by ID"""
    backup = db.query(Backup).filter(Backup.id == backup_id).first()
    if not backup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup not found"
        )

    return backup


@router.delete("/{backup_id}")
async def delete_backup(
    backup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a backup record (files are not deleted)"""
    backup = db.query(Backup).filter(Backup.id == backup_id).first()
    if not backup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup not found"
        )

    # Check permissions
    if backup.created_by != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this backup"
        )

    db.delete(backup)
    db.commit()

    return {"message": "Backup deleted"}
