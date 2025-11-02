from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.models.user import Base


class DatabaseType(str, enum.Enum):
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    MONGODB = "mongodb"
    REDIS = "redis"


class Database(Base):
    __tablename__ = "databases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Database connection details
    db_type = Column(SQLEnum(DatabaseType), nullable=False)
    host = Column(String, nullable=False)
    port = Column(Integer, nullable=False)
    username = Column(String, nullable=True)
    password_encrypted = Column(Text, nullable=True)  # Encrypted password
    database_name = Column(String, nullable=True)  # For PostgreSQL/MySQL

    # Additional options (stored as JSON string)
    connection_options = Column(Text, nullable=True)  # JSON string for extra options

    # Group relationship
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)

    # Metadata
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_backup_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    group = relationship("Group", back_populates="databases")
    creator = relationship("User", back_populates="databases", foreign_keys=[created_by])
    schedules = relationship("Schedule", back_populates="database", cascade="all, delete-orphan")
    backups = relationship("Backup", back_populates="database", cascade="all, delete-orphan")
    destinations = relationship("DatabaseDestination", back_populates="database", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Database {self.name} ({self.db_type})>"
