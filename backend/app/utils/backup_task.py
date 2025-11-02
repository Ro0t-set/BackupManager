"""
Backup execution task - separated to avoid circular imports
"""
import os
import json
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


def execute_backup_task(backup_id: int, database_id: int):
    """Background task to execute the backup"""
    db = SessionLocal()
    try:
        backup = db.query(Backup).filter(Backup.id == backup_id).first()
        database = db.query(Database).filter(Database.id == database_id).first()

        if not backup or not database:
            return

        # Update status to IN_PROGRESS
        backup.status = BackupStatus.IN_PROGRESS
        backup.started_at = datetime.utcnow()
        db.commit()

        # Get enabled destinations
        destinations = db.query(DatabaseDestination).filter(
            DatabaseDestination.database_id == database_id,
            DatabaseDestination.enabled == True
        ).all()

        # Step 1: Create database dump
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
            backup.status = BackupStatus.FAILED
            backup.error_message = error_msg
            backup.completed_at = datetime.utcnow()
            db.commit()
            return

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

        # Cleanup temp file
        try:
            os.remove(dump_file)
        except:
            pass

        db.commit()

    except Exception as e:
        if backup:
            backup.status = BackupStatus.FAILED
            backup.error_message = f"Backup execution failed: {str(e)}"
            backup.completed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()
