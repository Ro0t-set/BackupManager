from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from croniter import croniter

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.scheduler import add_schedule_job, remove_schedule_job
from app.models.user import User
from app.models.schedule import Schedule
from app.models.database import Database
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate, ScheduleResponse

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
