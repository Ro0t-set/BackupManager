from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.database import DatabaseType


class DatabaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    db_type: DatabaseType
    host: str
    port: int
    username: Optional[str] = None
    database_name: Optional[str] = None  # For PostgreSQL/MySQL
    connection_options: Optional[str] = None


class DatabaseCreate(DatabaseBase):
    password: Optional[str] = None  # Plain password, will be encrypted
    group_id: int


class DatabaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    database_name: Optional[str] = None
    connection_options: Optional[str] = None
    is_active: Optional[bool] = None


class DatabaseResponse(DatabaseBase):
    id: int
    group_id: int
    is_active: bool
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_backup_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DatabaseWithStats(DatabaseResponse):
    """Database response with additional statistics"""
    total_backups: int = 0
    total_schedules: int = 0
    last_backup_status: Optional[str] = None
    total_backup_size: int = 0  # in bytes


class DestinationFileInfo(BaseModel):
    """Information about file verification for a specific destination"""
    exists: bool
    file_path: str
    absolute_path: Optional[str] = None
    file_size_on_disk: Optional[int] = None
    is_accessible: bool = False
    error_message: Optional[str] = None


class BackupDestinationDetail(BaseModel):
    """Detailed information about a backup destination with file verification"""
    id: int
    storage_type: str
    storage_name: Optional[str] = None
    file_path: str
    base_path: Optional[str] = None
    file_size: Optional[int] = None
    checksum: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    upload_started_at: Optional[datetime] = None
    upload_completed_at: Optional[datetime] = None
    upload_duration_seconds: Optional[int] = None
    priority: int = 0
    file_info: Optional[DestinationFileInfo] = None  # File verification result

    class Config:
        from_attributes = True


class BackupDetailItem(BaseModel):
    """Detailed backup information with file verification for all destinations"""
    id: int
    name: str
    database_id: int
    schedule_id: Optional[int] = None
    status: str
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    created_at: datetime
    is_compressed: bool
    compression_type: Optional[str] = None

    # Multi-destination support
    destinations: List[BackupDestinationDetail] = []
    destination_results: Optional[str] = None  # JSON string with multi-destination results

    # Legacy fields (for backward compatibility with old backups)
    storage_type: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None

    class Config:
        from_attributes = True


class ScheduleDetailItem(BaseModel):
    """Detailed schedule information"""
    id: int
    name: str
    description: Optional[str] = None
    schedule_type: str
    cron_expression: Optional[str] = None
    interval_value: Optional[str] = None
    retention_days: int
    max_backups: Optional[int] = None
    is_active: bool
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Statistics for this schedule
    total_backups: int = 0
    successful_backups: int = 0
    failed_backups: int = 0

    class Config:
        from_attributes = True


class DatabaseDetailResponse(DatabaseResponse):
    """Complete database information with schedules, backups, and file verification"""
    # Statistics
    total_backups: int = 0
    successful_backups: int = 0
    failed_backups: int = 0
    total_backup_size: int = 0  # Total size in bytes
    
    # Related data
    schedules: List[ScheduleDetailItem] = []
    recent_backups: List[BackupDetailItem] = []  # Last 10 backups
    
    # Group information
    group_name: Optional[str] = None
