"""
Backup execution task - separated to avoid circular imports
"""
import os
import json
import logging
from datetime import datetime

from app.core.database import SessionLocal
from app.models.backup import Backup, BackupStatus
from app.models.database import Database
from app.models.database_destination import DatabaseDestination
from app.utils.backup_executor import (
    create_database_dump,
    copy_to_destinations,
    determine_backup_status
)

logger = logging.getLogger(__name__)


def execute_backup_task(backup_id: int, database_id: int):
    """Background task to execute the backup"""
    db = SessionLocal()
    try:
        logger.info(f"Starting backup task for backup_id={backup_id}, database_id={database_id}")
        
        backup = db.query(Backup).filter(Backup.id == backup_id).first()
        database = db.query(Database).filter(Database.id == database_id).first()

        if not backup or not database:
            logger.error(f"Backup or database not found: backup_id={backup_id}, database_id={database_id}")
            return

        # Update status to IN_PROGRESS
        backup.status = BackupStatus.IN_PROGRESS
        backup.started_at = datetime.utcnow()
        db.commit()
        logger.info(f"Backup {backup_id} status updated to IN_PROGRESS")

        # Get enabled destinations
        destinations = db.query(DatabaseDestination).filter(
            DatabaseDestination.database_id == database_id,
            DatabaseDestination.enabled == True
        ).all()

        # Step 1: Create database dump
        logger.info(f"Creating database dump for {database.name}...")
        success, dump_file, error_msg = create_database_dump(
            db_type=database.db_type.value,
            host=database.host,
            port=database.port,
            username=database.username,
            password_encrypted=database.password_encrypted,
            database_name=database.database_name,
            backup_name=backup.name
        )

        if not success:
            logger.error(f"Dump creation failed for backup {backup_id}: {error_msg}")
            backup.status = BackupStatus.FAILED
            backup.error_message = error_msg
            backup.completed_at = datetime.utcnow()
            db.commit()
            return

        logger.info(f"Dump created successfully: {dump_file}")
        # Get file size
        file_size = os.path.getsize(dump_file)
        backup.file_size = file_size

        # Step 2: Copy to all destinations
        project_name = database.group.name if database.group else "default"
        destination_results = copy_to_destinations(
            source_file=dump_file,
            destinations=destinations,
            project_name=project_name,
            database_name=database.name
        )

        # Step 3: Determine final status
        final_status = determine_backup_status(destination_results)
        backup.status = BackupStatus[final_status.upper()]
        backup.destination_results = json.dumps(destination_results)
        backup.completed_at = datetime.utcnow()

        if backup.started_at:
            duration = (backup.completed_at - backup.started_at).total_seconds()
            backup.duration_seconds = int(duration)

        # Cleanup temporary dump file
        try:
            if os.path.exists(dump_file):
                os.remove(dump_file)
                logger.info(f"Cleaned up temporary dump file: {dump_file}")
            else:
                logger.warning(f"Temporary dump file not found for cleanup: {dump_file}")
        except Exception as e:
            logger.error(f"Failed to cleanup temporary dump file {dump_file}: {str(e)}")

        db.commit()
        logger.info(f"Backup {backup.id} completed with status: {final_status}")

    except Exception as e:
        if backup:
            backup.status = BackupStatus.FAILED
            backup.error_message = f"Backup execution failed: {str(e)}"
            backup.completed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()
