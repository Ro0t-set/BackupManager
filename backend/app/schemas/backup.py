from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.backup import BackupStatus, StorageType


class BackupBase(BaseModel):
    name: str
    storage_type: StorageType = StorageType.LOCAL
    is_compressed: bool = True
    is_encrypted: bool = False
    compression_type: Optional[str] = "gzip"


class BackupCreate(BaseModel):
    """Trigger a manual backup"""
    database_id: int
    storage_type: StorageType = StorageType.LOCAL
    is_compressed: bool = True
    is_encrypted: bool = False


class BackupResponse(BackupBase):
    id: int
    database_id: int
    schedule_id: Optional[int] = None
    file_path: str
    file_size: Optional[int] = None
    checksum: Optional[str] = None
    status: BackupStatus
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class BackupStats(BaseModel):
    """Backup statistics"""
    total_backups: int
    successful_backups: int
    failed_backups: int
    total_size_bytes: int
    avg_duration_seconds: Optional[float] = None
    last_backup_at: Optional[datetime] = None
