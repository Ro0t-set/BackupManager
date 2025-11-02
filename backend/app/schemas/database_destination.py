from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DatabaseDestinationBase(BaseModel):
    """Base schema for database destination configuration"""
    path: str  # Full path (e.g., /home/user/backups, /mnt/nas, /media/usb-backup)
    enabled: bool = True


class DatabaseDestinationCreate(DatabaseDestinationBase):
    """Schema for creating a new destination for a database"""
    database_id: int


class DatabaseDestinationUpdate(BaseModel):
    """Schema for updating a destination"""
    path: Optional[str] = None
    enabled: Optional[bool] = None


class DatabaseDestinationResponse(DatabaseDestinationBase):
    """Complete destination response"""
    id: int
    database_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class DatabaseDestinationWithStats(DatabaseDestinationResponse):
    """Destination with backup sync statistics"""
    total_backups: int = 0  # Total backups for this database
    present_backups: int = 0  # How many are actually present at this destination
    missing_backups: int = 0  # How many are missing
    last_verified_at: Optional[datetime] = None
    is_accessible: bool = True  # Can we read from this path?
    free_space_gb: Optional[float] = None  # Available space in GB
