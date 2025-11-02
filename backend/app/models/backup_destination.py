from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, BigInteger, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.models.user import Base


class DestinationStatus(str, enum.Enum):
    """Status of backup upload to a specific destination"""
    PENDING = "pending"
    UPLOADING = "uploading"
    COMPLETED = "completed"
    FAILED = "failed"


class StorageType(str, enum.Enum):
    """Type of storage destination"""
    LOCAL = "local"
    LOCAL_EXTERNAL = "local_external"  # External drive, NAS, etc.
    S3 = "s3"
    MINIO = "minio"
    SPACES = "spaces"  # DigitalOcean Spaces
    BACKBLAZE = "backblaze"
    AZURE_BLOB = "azure_blob"
    GCS = "gcs"  # Google Cloud Storage


class BackupDestination(Base):
    """
    Represents a single destination where a backup is stored.
    A backup can have multiple destinations (multi-destination backups).
    """
    __tablename__ = "backup_destinations"

    id = Column(Integer, primary_key=True, index=True)
    
    # Reference to parent backup
    backup_id = Column(Integer, ForeignKey("backups.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Storage details
    storage_type = Column(SQLEnum(StorageType), nullable=False)
    storage_name = Column(String, nullable=True)  # e.g., "Main Storage", "External HDD", "AWS S3 Prod"
    file_path = Column(Text, nullable=False)  # Path or S3 key
    base_path = Column(Text, nullable=True)  # Base path for local storage (e.g., /mnt/external_hdd)
    
    # File information
    file_size = Column(BigInteger, nullable=True)  # Size in bytes for this destination
    checksum = Column(String, nullable=True)  # MD5 or SHA256
    
    # Upload/sync status for this destination
    status = Column(SQLEnum(DestinationStatus), nullable=False, default=DestinationStatus.PENDING)
    error_message = Column(Text, nullable=True)
    
    # Timing for this destination
    upload_started_at = Column(DateTime(timezone=True), nullable=True)
    upload_completed_at = Column(DateTime(timezone=True), nullable=True)
    upload_duration_seconds = Column(Integer, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Additional storage-specific configuration (JSON string)
    storage_config = Column(Text, nullable=True)  # e.g., bucket name, region, credentials ref, etc.
    
    # Priority/order for multi-destination backups
    priority = Column(Integer, default=0)  # Lower number = higher priority
    
    # Relationships
    backup = relationship("Backup", back_populates="destinations")

    def __repr__(self):
        return f"<BackupDestination {self.storage_type}:{self.file_path} ({self.status})>"
