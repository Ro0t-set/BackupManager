from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.database import Database
from app.models.backup import Backup, BackupStatus
from app.models.database_destination import DatabaseDestination
from app.utils.backup_task import execute_backup_task

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


@router.get("/{backup_id}/verify")
async def verify_backup_files(
    backup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verify if backup files still exist on disk for all destinations.
    Returns file existence status for each destination.
    """
    import json
    import os

    backup = db.query(Backup).filter(Backup.id == backup_id).first()
    if not backup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup not found"
        )

    if not backup.destination_results:
        return {
            "backup_id": backup_id,
            "verified_at": datetime.utcnow().isoformat(),
            "destinations": {},
            "all_exist": False,
            "missing_count": 0,
            "total_count": 0
        }

    try:
        results = json.loads(backup.destination_results)
        verification = {}
        missing_count = 0
        total_count = 0

        for path, result in results.items():
            if result.get('success') and result.get('file_path'):
                file_path = result['file_path']
                exists = os.path.exists(file_path)
                file_size = os.path.getsize(file_path) if exists else None

                verification[path] = {
                    "file_path": file_path,
                    "exists": exists,
                    "size_bytes": file_size,
                    "original_size_mb": result.get('size_mb')
                }

                total_count += 1
                if not exists:
                    missing_count += 1

        return {
            "backup_id": backup_id,
            "verified_at": datetime.utcnow().isoformat(),
            "destinations": verification,
            "all_exist": missing_count == 0,
            "missing_count": missing_count,
            "total_count": total_count
        }

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error parsing backup destinations"
        )


@router.get("/{backup_id}/download")
async def download_backup(
    backup_id: int,
    destination_path: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download a backup file from a specific destination.

    - backup_id: ID of backup
    - destination_path: Path of destination to download from (optional, uses first available if not specified)
    """
    from fastapi.responses import FileResponse
    import json
    import os

    backup = db.query(Backup).filter(Backup.id == backup_id).first()
    if not backup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup not found"
        )

    if not backup.destination_results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No backup files found"
        )

    try:
        results = json.loads(backup.destination_results)

        # Find the file to download
        file_path = None
        if destination_path:
            # Download from specific destination
            if destination_path in results and results[destination_path].get('success'):
                file_path = results[destination_path]['file_path']
        else:
            # Download from first available destination
            for path, result in results.items():
                if result.get('success') and result.get('file_path'):
                    file_path = result['file_path']
                    break

        if not file_path or not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Backup file not found on disk"
            )

        return FileResponse(
            path=file_path,
            filename=os.path.basename(file_path),
            media_type='application/octet-stream'
        )

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error parsing backup destinations"
        )


@router.delete("/{backup_id}")
async def delete_backup(
    backup_id: int,
    delete_files: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a backup record and optionally delete backup files from all destinations.

    - backup_id: ID of backup to delete
    - delete_files: If True, also delete physical backup files from all destinations
    """
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

    deleted_files = []
    errors = []

    # Delete physical files if requested
    if delete_files and backup.destination_results:
        import json
        import os

        try:
            results = json.loads(backup.destination_results)
            for path, result in results.items():
                if result.get('success') and result.get('file_path'):
                    file_path = result['file_path']
                    try:
                        if os.path.exists(file_path):
                            os.remove(file_path)
                            deleted_files.append(file_path)
                    except Exception as e:
                        errors.append(f"{file_path}: {str(e)}")
        except Exception as e:
            errors.append(f"Error parsing destination results: {str(e)}")

    # Delete database record
    db.delete(backup)
    db.commit()

    return {
        "message": "Backup deleted",
        "deleted_files": deleted_files,
        "errors": errors if errors else None
    }
