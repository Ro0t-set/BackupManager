from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import os
import shutil
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.database import Database
from app.models.backup import Backup, BackupStatus
from app.models.database_destination import DatabaseDestination

router = APIRouter()


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

    # TODO: Execute backup in background task
    # background_tasks.add_task(execute_backup, new_backup.id, database_id, db)

    return {
        "message": "Backup started",
        "backup_id": new_backup.id,
        "backup_name": backup_name,
        "destinations": [dest.path for dest in destinations]
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
