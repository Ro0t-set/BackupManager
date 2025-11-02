from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from croniter import croniter
import json
import os
import logging

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.scheduler import add_schedule_job, remove_schedule_job
from app.models.user import User
from app.models.schedule import Schedule
from app.models.database import Database
from app.models.backup import Backup, BackupStatus
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate, ScheduleResponse
from sqlalchemy import and_
from datetime import timedelta

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=List[ScheduleResponse])
def list_schedules(
    database_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all schedules, optionally filtered by database"""
    query = db.query(Schedule)
    
    if database_id:
        query = query.filter(Schedule.database_id == database_id)
    
    schedules = query.offset(skip).limit(limit).all()
    return schedules


@router.get("/{schedule_id}", response_model=ScheduleResponse)
def get_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific schedule by ID"""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    
    return schedule


@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(
    schedule_data: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new backup schedule"""
    # Verify database exists
    database = db.query(Database).filter(Database.id == schedule_data.database_id).first()
    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database not found"
        )

    # Validate cron expression if provided
    if schedule_data.cron_expression:
        try:
            if not croniter.is_valid(schedule_data.cron_expression):
                raise ValueError("Invalid cron expression")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid cron expression format"
            )

    # Create new schedule with created_by from current user
    schedule_dict = schedule_data.dict()
    schedule_dict['created_by'] = current_user.id

    # Calculate next_run_at if cron expression provided
    is_active = schedule_dict.get('is_active', True)
    if schedule_data.cron_expression and is_active:
        try:
            cron = croniter(schedule_data.cron_expression, datetime.utcnow())
            schedule_dict['next_run_at'] = cron.get_next(datetime)
        except Exception:
            pass

    new_schedule = Schedule(**schedule_dict)
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)

    # Add to scheduler if active
    if new_schedule.is_active and new_schedule.cron_expression:
        add_schedule_job(new_schedule)

    return new_schedule


@router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(
    schedule_id: int,
    schedule_data: ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing schedule"""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    # Update schedule fields
    update_data = schedule_data.dict(exclude_unset=True)

    # Validate cron expression if changed
    if 'cron_expression' in update_data and update_data['cron_expression']:
        try:
            if not croniter.is_valid(update_data['cron_expression']):
                raise ValueError("Invalid cron expression")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid cron expression format"
            )

    # Update fields
    for field, value in update_data.items():
        setattr(schedule, field, value)

    # Recalculate next_run_at if cron expression changed or is_active changed
    if ('cron_expression' in update_data or 'is_active' in update_data):
        if schedule.is_active and schedule.cron_expression:
            try:
                cron = croniter(schedule.cron_expression, datetime.utcnow())
                schedule.next_run_at = cron.get_next(datetime)
            except Exception:
                pass

    db.commit()
    db.refresh(schedule)

    # Update scheduler
    remove_schedule_job(schedule.id)
    if schedule.is_active and schedule.cron_expression:
        add_schedule_job(schedule)

    return schedule


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a schedule"""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    # Remove from scheduler first
    remove_schedule_job(schedule.id)

    db.delete(schedule)
    db.commit()

    return None


@router.post("/{schedule_id}/cleanup")
def cleanup_schedule_backups(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger cleanup of old backups for a schedule based on its retention policy.
    This is useful for testing or forcing a cleanup outside of the automatic scheduler.
    """
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    # Get all completed backups for this schedule
    all_backups = db.query(Backup).filter(
        and_(
            Backup.schedule_id == schedule.id,
            Backup.status == BackupStatus.COMPLETED
        )
    ).order_by(Backup.created_at.desc()).all()

    backups_to_delete = []
    deleted_files = []
    errors = []

    # Apply retention_days policy
    if schedule.retention_days and schedule.retention_days > 0:
        cutoff_date = datetime.utcnow() - timedelta(days=schedule.retention_days)
        for backup in all_backups:
            if backup.created_at and backup.created_at < cutoff_date:
                backups_to_delete.append(backup)

    # Apply max_backups policy
    if schedule.max_backups and schedule.max_backups > 0:
        if len(all_backups) > schedule.max_backups:
            excess_backups = all_backups[schedule.max_backups:]
            for backup in excess_backups:
                if backup not in backups_to_delete:
                    backups_to_delete.append(backup)

    # Delete marked backups
    for backup in backups_to_delete:
        try:
            # Delete files from multi-destination results
            if backup.destination_results:
                try:
                    results = json.loads(backup.destination_results)
                    for dest_name, dest_data in results.items():
                        if dest_data.get('success') and dest_data.get('file_path'):
                            file_path = dest_data['file_path']
                            if os.path.exists(file_path):
                                try:
                                    os.remove(file_path)
                                    deleted_files.append(file_path)
                                    logger.info(f"Deleted backup file: {file_path}")
                                except Exception as e:
                                    errors.append(f"Error deleting {file_path}: {str(e)}")
                except json.JSONDecodeError as e:
                    errors.append(f"Error parsing destination_results for backup {backup.id}: {str(e)}")
            
            # Delete legacy file path
            if backup.file_path and os.path.exists(backup.file_path):
                try:
                    os.remove(backup.file_path)
                    deleted_files.append(backup.file_path)
                except Exception as e:
                    errors.append(f"Error deleting {backup.file_path}: {str(e)}")
            
            # Delete backup record
            db.delete(backup)
        except Exception as e:
            errors.append(f"Error processing backup {backup.id}: {str(e)}")

    db.commit()

    return {
        "message": f"Cleanup completed for schedule {schedule.name}",
        "schedule_id": schedule_id,
        "retention_days": schedule.retention_days,
        "max_backups": schedule.max_backups,
        "total_backups_before": len(all_backups),
        "backups_deleted": len(backups_to_delete),
        "files_deleted": deleted_files,
        "errors": errors if errors else None
    }
