from sqlalchemy import Column, Integer, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.user import Base


class DatabaseDestination(Base):
    """
    Backup destination path configured for a database.
    All backups of this database will be saved to these destinations.
    """
    __tablename__ = "database_destinations"

    id = Column(Integer, primary_key=True, index=True)
    database_id = Column(Integer, ForeignKey("databases.id", ondelete="CASCADE"), nullable=False, index=True)

    # Destination path (e.g., /home/user/backups, /mnt/nas, /media/usb-backup)
    path = Column(Text, nullable=False)

    # Enable/disable this destination
    enabled = Column(Boolean, default=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    database = relationship("Database", back_populates="destinations")

    def __repr__(self):
        return f"<DatabaseDestination {self.path} ({'enabled' if self.enabled else 'disabled'})>"
