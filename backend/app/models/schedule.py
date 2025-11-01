from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.models.user import Base


class ScheduleType(str, enum.Enum):
    CRON = "cron"
    INTERVAL = "interval"  # hourly, daily, weekly, monthly
    MANUAL = "manual"


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Schedule configuration
    schedule_type = Column(SQLEnum(ScheduleType), nullable=False, default=ScheduleType.CRON)
    cron_expression = Column(String, nullable=True)  # e.g., "0 2 * * *" for daily at 2 AM
    interval_value = Column(String, nullable=True)  # e.g., "daily", "weekly", "monthly"

    # Retention policy
    retention_days = Column(Integer, default=30)  # Keep backups for N days
    max_backups = Column(Integer, nullable=True)  # Max number of backups to keep

    # Database relationship
    database_id = Column(Integer, ForeignKey("databases.id"), nullable=False)

    # Status
    is_active = Column(Boolean, default=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    database = relationship("Database", back_populates="schedules")
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self):
        return f"<Schedule {self.name} ({self.cron_expression})>"
