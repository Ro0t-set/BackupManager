from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BackupDestinationBase(BaseModel):
    """Base schema for backup destination"""
    storage_type: str
    storage_name: Optional[str] = None
    file_path: str
    base_path: Optional[str] = None
    storage_config: Optional[str] = None
    priority: int = 0


class BackupDestinationCreate(BackupDestinationBase):
    """Schema for creating a new backup destination"""
    backup_id: int


class BackupDestinationUpdate(BaseModel):
    """Schema for updating a backup destination"""
    storage_name: Optional[str] = None
    file_path: Optional[str] = None
    base_path: Optional[str] = None
    file_size: Optional[int] = None
    checksum: Optional[str] = None
    status: Optional[str] = None
    error_message: Optional[str] = None
    storage_config: Optional[str] = None
    priority: Optional[int] = None


class DestinationFileInfo(BaseModel):
    """Information about file verification for a specific destination"""
    exists: bool
    file_path: str
    absolute_path: Optional[str] = None
    file_size_on_disk: Optional[int] = None
    is_accessible: bool = False
    error_message: Optional[str] = None


class BackupDestinationResponse(BackupDestinationBase):
    """Complete backup destination response"""
    id: int
    backup_id: int
    file_size: Optional[int] = None
    checksum: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    upload_started_at: Optional[datetime] = None
    upload_completed_at: Optional[datetime] = None
    upload_duration_seconds: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # File verification (populated by endpoint)
    file_info: Optional[DestinationFileInfo] = None

    class Config:
        from_attributes = True


class BackupDestinationStats(BaseModel):
    """Statistics for backup destinations"""
    total_destinations: int = 0
    completed_destinations: int = 0
    failed_destinations: int = 0
    pending_destinations: int = 0
    total_size_all_destinations: int = 0  # Sum of all destination sizes
