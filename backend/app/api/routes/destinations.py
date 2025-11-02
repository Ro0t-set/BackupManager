from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import os
import shutil

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.database import Database
from app.models.database_destination import DatabaseDestination
from app.schemas.database_destination import (
    DatabaseDestinationCreate,
    DatabaseDestinationUpdate,
    DatabaseDestinationResponse,
    DatabaseDestinationWithStats
)

router = APIRouter()


@router.get("/{database_id}/destinations", response_model=List[DatabaseDestinationResponse])
def list_database_destinations(
    database_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all backup destinations configured for a database"""
    database = db.query(Database).filter(Database.id == database_id).first()
    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database not found"
        )

    return database.destinations


@router.post("/{database_id}/destinations", response_model=DatabaseDestinationResponse, status_code=status.HTTP_201_CREATED)
def add_database_destination(
    database_id: int,
    destination_data: DatabaseDestinationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add a new backup destination for a database.
    Validates that the path exists and is writable.
    """
    database = db.query(Database).filter(Database.id == database_id).first()
    if not database:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database not found"
        )

    # Validate path exists and is writable
    path = destination_data.path
    if not os.path.exists(path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Path does not exist: {path}"
        )

    if not os.path.isdir(path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Path is not a directory: {path}"
        )

    if not os.access(path, os.W_OK):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Path is not writable: {path}"
        )

    # Check if destination already exists
    existing = db.query(DatabaseDestination).filter(
        DatabaseDestination.database_id == database_id,
        DatabaseDestination.path == path
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Destination already exists: {path}"
        )

    # Create new destination
    new_destination = DatabaseDestination(
        database_id=database_id,
        path=path,
        enabled=destination_data.enabled
    )

    db.add(new_destination)
    db.commit()
    db.refresh(new_destination)

    return new_destination


@router.put("/{database_id}/destinations/{destination_id}", response_model=DatabaseDestinationResponse)
def update_database_destination(
    database_id: int,
    destination_id: int,
    destination_data: DatabaseDestinationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a backup destination (enable/disable or change path)"""
    destination = db.query(DatabaseDestination).filter(
        DatabaseDestination.id == destination_id,
        DatabaseDestination.database_id == database_id
    ).first()

    if not destination:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Destination not found"
        )

    # Update fields
    update_data = destination_data.dict(exclude_unset=True)

    # If updating path, validate it
    if "path" in update_data and update_data["path"]:
        new_path = update_data["path"]
        if not os.path.exists(new_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path does not exist: {new_path}"
            )
        if not os.path.isdir(new_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path is not a directory: {new_path}"
            )
        if not os.access(new_path, os.W_OK):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path is not writable: {new_path}"
            )

    for field, value in update_data.items():
        setattr(destination, field, value)

    db.commit()
    db.refresh(destination)

    return destination


@router.delete("/{database_id}/destinations/{destination_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_database_destination(
    database_id: int,
    destination_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a backup destination from a database"""
    destination = db.query(DatabaseDestination).filter(
        DatabaseDestination.id == destination_id,
        DatabaseDestination.database_id == database_id
    ).first()

    if not destination:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Destination not found"
        )

    db.delete(destination)
    db.commit()

    return None


@router.post("/{database_id}/destinations/validate-path", status_code=status.HTTP_200_OK)
def validate_destination_path(
    database_id: int,
    path: str,
    current_user: User = Depends(get_current_user)
):
    """
    Validate a path before adding it as a destination.
    Returns path info including existence, writability, and free space.
    """
    exists = os.path.exists(path)
    is_dir = os.path.isdir(path) if exists else False
    is_writable = os.access(path, os.W_OK) if exists else False

    free_space_gb = None
    if exists and is_dir:
        try:
            stat = shutil.disk_usage(path)
            free_space_gb = stat.free / (1024 ** 3)  # Convert to GB
        except Exception:
            pass

    return {
        "path": path,
        "exists": exists,
        "is_directory": is_dir,
        "is_writable": is_writable,
        "free_space_gb": round(free_space_gb, 2) if free_space_gb else None,
        "valid": exists and is_dir and is_writable
    }


@router.get("/{database_id}/destinations/{destination_id}/stats", response_model=DatabaseDestinationWithStats)
def get_destination_stats(
    database_id: int,
    destination_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics for a specific destination:
    - How many backups should be there
    - How many are actually present
    - How many are missing
    - Free space available
    """
    destination = db.query(DatabaseDestination).filter(
        DatabaseDestination.id == destination_id,
        DatabaseDestination.database_id == database_id
    ).first()

    if not destination:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Destination not found"
        )

    # TODO: Implement actual file verification
    # For now, return placeholder data
    free_space_gb = None
    is_accessible = os.path.exists(destination.path) and os.access(destination.path, os.R_OK)

    if is_accessible:
        try:
            stat = shutil.disk_usage(destination.path)
            free_space_gb = stat.free / (1024 ** 3)
        except Exception:
            is_accessible = False

    return DatabaseDestinationWithStats(
        **destination.__dict__,
        total_backups=0,  # TODO: Count from backup_logs
        present_backups=0,  # TODO: Verify files on disk
        missing_backups=0,  # TODO: Calculate difference
        last_verified_at=None,  # TODO: Implement verification tracking
        is_accessible=is_accessible,
        free_space_gb=round(free_space_gb, 2) if free_space_gb else None
    )
