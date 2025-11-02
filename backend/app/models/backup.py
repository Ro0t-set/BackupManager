from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, BigInteger, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.models.user import Base


class BackupStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"  # Saved to some destinations but not all


class StorageType(str, enum.Enum):
    LOCAL = "local"
    S3 = "s3"
    MINIO = "minio"
    SPACES = "spaces"  # DigitalOcean Spaces
    BACKBLAZE = "backblaze"


class Backup(Base):
    __tablename__ = "backups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # Auto-generated: db_name_YYYYMMDD_HHMMSS

    # Backup details
    database_id = Column(Integer, ForeignKey("databases.id"), nullable=False)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=True)  # NULL if manual

    # Storage information (DEPRECATED - kept for backward compatibility)
    storage_type = Column(SQLEnum(StorageType), nullable=True, default=StorageType.LOCAL)
    file_path = Column(Text, nullable=True)  # Local path or S3 key
    file_size = Column(BigInteger, nullable=True)  # Size in bytes
    checksum = Column(String, nullable=True)  # MD5 or SHA256

    # Multi-destination results (JSON string)
    # Format: {"path": {"success": true, "file_path": "...", "size_mb": 150, "error": null}}
    destination_results = Column(Text, nullable=True)

    # Backup status
    status = Column(SQLEnum(BackupStatus), nullable=False, default=BackupStatus.PENDING)
    error_message = Column(Text, nullable=True)

    # Timing
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)

    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Compression and encryption
    is_compressed = Column(Boolean, default=True)
    is_encrypted = Column(Boolean, default=False)
    compression_type = Column(String, nullable=True)  # gzip, bzip2, xz

    # Relationships
    database = relationship("Database", back_populates="backups")
    schedule = relationship("Schedule")
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self):
        return f"<Backup {self.name} ({self.status})>"
