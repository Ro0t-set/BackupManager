from pydantic import BaseModel, Field
from typing import Optional
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
