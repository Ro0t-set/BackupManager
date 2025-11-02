"""
Background scheduler for executing scheduled backups.
Custom implementation using threading and croniter.
"""
import threading
import time
import os
import json
from datetime import datetime, timedelta
from croniter import croniter
import logging
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.database import SessionLocal
from app.models.schedule import Schedule
from app.models.backup import Backup, BackupStatus
from app.utils.backup_task import execute_backup_task

logger = logging.getLogger(__name__)

# Global scheduler thread
scheduler_thread = None
scheduler_running = False


def execute_scheduled_backup(schedule_id: int):
    """
    Execute a backup for a given schedule.
    This function is called by APScheduler when a cron job triggers.
    """
    db = SessionLocal()
    try:
        schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()

        if not schedule or not schedule.is_active:
            logger.warning(f"Schedule {schedule_id} not found or inactive")
            return

        logger.info(f"Executing scheduled backup for: {schedule.name} (ID: {schedule_id})")

        # Create backup record
        backup_name = f"{schedule.database.name}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
        new_backup = Backup(
            name=backup_name,
            database_id=schedule.database_id,
            schedule_id=schedule.id,
            status=BackupStatus.PENDING,
            created_by=schedule.created_by,
            is_compressed=True
        )

        db.add(new_backup)
        db.commit()
        db.refresh(new_backup)

        # Update schedule last_run
        schedule.last_run_at = datetime.utcnow()

        # Calculate next run time
        if schedule.cron_expression:
            cron = croniter(schedule.cron_expression, datetime.utcnow())
            schedule.next_run_at = cron.get_next(datetime)

        db.commit()

        # Execute backup (this will run in the background)
        execute_backup_task(new_backup.id, schedule.database_id)

        # Cleanup old backups based on retention policy
        cleanup_old_backups(db, schedule)

        logger.info(f"Scheduled backup created successfully: {backup_name}")

    except Exception as e:
        logger.error(f"Error executing scheduled backup for schedule {schedule_id}: {str(e)}")
    finally:
        db.close()


def cleanup_old_backups(db: Session, schedule: Schedule):
    """
    Cleanup old backups based on retention_days and max_backups settings.
    
    IMPORTANT: This function only deletes backups created by THIS specific schedule.
    It filters by schedule_id to ensure different schedules don't interfere with each other.
    Manual backups (schedule_id = NULL) are never affected by this cleanup.
    
    Args:
        db: Database session
        schedule: The schedule whose backups should be cleaned up
    """
    try:
        logger.info(f"Starting cleanup for schedule {schedule.id} (retention_days={schedule.retention_days}, max_backups={schedule.max_backups})")
        
        # Get all completed backups for THIS SPECIFIC schedule only
        # This ensures each schedule manages only its own backups
        all_backups = db.query(Backup).filter(
            and_(
                Backup.schedule_id == schedule.id,  # ← CRITICAL: Only backups from THIS schedule
                Backup.status == BackupStatus.COMPLETED
            )
        ).order_by(Backup.created_at.desc()).all()
        
        logger.info(f"Found {len(all_backups)} completed backups for schedule {schedule.id}")

        backups_to_delete = []

        # Apply retention_days policy
        if schedule.retention_days and schedule.retention_days > 0:
            cutoff_date = datetime.utcnow() - timedelta(days=schedule.retention_days)
            for backup in all_backups:
                if backup.created_at and backup.created_at < cutoff_date:
                    backups_to_delete.append(backup)
                    logger.info(f"Backup {backup.id} ({backup.name}) marked for deletion (older than {schedule.retention_days} days)")

        # Apply max_backups policy (keep only the N most recent)
        if schedule.max_backups and schedule.max_backups > 0:
            if len(all_backups) > schedule.max_backups:
                # Skip the first max_backups (most recent), delete the rest
                excess_backups = all_backups[schedule.max_backups:]
                for backup in excess_backups:
                    if backup not in backups_to_delete:
                        backups_to_delete.append(backup)
                        logger.info(f"Backup {backup.id} ({backup.name}) marked for deletion (exceeds max_backups limit of {schedule.max_backups})")

        # Delete marked backups
        for backup in backups_to_delete:
            try:
                deleted_files = 0
                
                # Delete files from multi-destination results (NEW SYSTEM)
                if backup.destination_results:
                    try:
                        results = json.loads(backup.destination_results)
                        for dest_name, dest_data in results.items():
                            if dest_data.get('success') and dest_data.get('file_path'):
                                file_path = dest_data['file_path']
                                if os.path.exists(file_path):
                                    try:
                                        os.remove(file_path)
                                        deleted_files += 1
                                        logger.info(f"Deleted backup file: {file_path} (destination: {dest_name})")
                                    except Exception as e:
                                        logger.error(f"Error deleting file {file_path}: {str(e)}")
                                else:
                                    logger.warning(f"Backup file not found: {file_path}")
                    except json.JSONDecodeError as e:
                        logger.error(f"Error parsing destination_results for backup {backup.id}: {str(e)}")
                
                # Delete legacy single file path (OLD SYSTEM - for backward compatibility)
                if backup.file_path and os.path.exists(backup.file_path):
                    try:
                        os.remove(backup.file_path)
                        deleted_files += 1
                        logger.info(f"Deleted legacy backup file: {backup.file_path}")
                    except Exception as e:
                        logger.error(f"Error deleting legacy file {backup.file_path}: {str(e)}")
                
                # Delete backup record from database
                db.delete(backup)
                logger.info(f"Deleted backup record: {backup.id} (removed {deleted_files} file(s))")
                
            except Exception as e:
                logger.error(f"Error deleting backup {backup.id}: {str(e)}")

        if backups_to_delete:
            db.commit()
            logger.info(f"Cleanup completed: {len(backups_to_delete)} backups removed for schedule {schedule.id}")
        else:
            logger.info(f"No backups to cleanup for schedule {schedule.id}")

    except Exception as e:
        logger.error(f"Error during backup cleanup for schedule {schedule.id}: {str(e)}")
        db.rollback()


def scheduler_loop():
    """Main scheduler loop that runs in background thread"""
    global scheduler_running
    logger.info("Scheduler loop started")

    while scheduler_running:
        try:
            db = SessionLocal()
            try:
                now = datetime.utcnow()

                # Get all active schedules with cron expressions (both cron and interval types)
                schedules = db.query(Schedule).filter(
                    Schedule.is_active == True,
                    Schedule.cron_expression.isnot(None)
                ).all()

                for schedule in schedules:
                    try:
                        # Check if schedule should run
                        if should_schedule_run(schedule, now):
                            logger.info(f"Triggering scheduled backup: {schedule.name}")
                            # Execute in separate thread to not block scheduler
                            threading.Thread(
                                target=execute_scheduled_backup,
                                args=(schedule.id,),
                                daemon=True
                            ).start()

                            # Update next_run_at
                            update_schedule_next_run(db, schedule)

                    except Exception as e:
                        logger.error(f"Error processing schedule {schedule.id}: {str(e)}")

            finally:
                db.close()

        except Exception as e:
            logger.error(f"Error in scheduler loop: {str(e)}")

        # Sleep for 30 seconds before next check
        time.sleep(30)

    logger.info("Scheduler loop stopped")


def should_schedule_run(schedule: Schedule, now: datetime) -> bool:
    """Check if a schedule should run at the current time"""
    if not schedule.cron_expression:
        return False

    try:
        # If next_run_at is not set, calculate it
        if not schedule.next_run_at:
            return True

        # Check if current time has passed next_run_at (with 1 minute tolerance)
        return now >= (schedule.next_run_at - timedelta(seconds=30))

    except Exception as e:
        logger.error(f"Error checking if schedule should run: {str(e)}")
        return False


def update_schedule_next_run(db: Session, schedule: Schedule):
    """Update the next_run_at field for a schedule"""
    try:
        cron = croniter(schedule.cron_expression, datetime.utcnow())
        schedule.next_run_at = cron.get_next(datetime)
        db.commit()
    except Exception as e:
        logger.error(f"Error updating next_run_at for schedule {schedule.id}: {str(e)}")


def add_schedule_job(schedule: Schedule):
    """Calculate and set next_run_at for a schedule (no-op for compatibility)"""
    if not schedule.is_active or not schedule.cron_expression:
        return

    logger.info(f"Schedule registered: {schedule.name} ({schedule.cron_expression})")


def remove_schedule_job(schedule_id: int):
    """Remove a schedule (no-op for compatibility)"""
    logger.info(f"Schedule unregistered: {schedule_id}")


def reload_all_schedules():
    """
    Update next_run_at for all active schedules.
    Called on startup.
    """
    db = SessionLocal()
    try:
        # Load all schedules with cron expressions (both cron and interval types use cron internally)
        schedules = db.query(Schedule).filter(
            Schedule.is_active == True,
            Schedule.cron_expression.isnot(None)
        ).all()

        logger.info(f"Initializing {len(schedules)} active schedules...")

        for schedule in schedules:
            # Update next_run_at if not set or in the past
            if not schedule.next_run_at or schedule.next_run_at < datetime.utcnow():
                try:
                    cron = croniter(schedule.cron_expression, datetime.utcnow())
                    schedule.next_run_at = cron.get_next(datetime)
                except Exception as e:
                    logger.error(f"Error calculating next_run_at for schedule {schedule.id}: {str(e)}")

        db.commit()
        logger.info(f"Successfully initialized {len(schedules)} schedules")

    except Exception as e:
        logger.error(f"Error reloading schedules: {str(e)}")
    finally:
        db.close()


def start_scheduler():
    """Initialize and start the background scheduler thread"""
    global scheduler_thread, scheduler_running

    if scheduler_running:
        logger.warning("Scheduler already started")
        return

    logger.info("Starting background scheduler...")
    scheduler_running = True

    # Initialize next_run_at for all schedules
    reload_all_schedules()

    # Start scheduler thread
    scheduler_thread = threading.Thread(target=scheduler_loop, daemon=False, name="SchedulerThread")
    scheduler_thread.start()

    logger.info(f"Scheduler started (thread alive: {scheduler_thread.is_alive()})")


def stop_scheduler():
    """Stop the background scheduler thread"""
    global scheduler_running, scheduler_thread

    if not scheduler_running:
        return

    logger.info("Stopping background scheduler...")
    scheduler_running = False

    if scheduler_thread:
        scheduler_thread.join(timeout=5)

    logger.info("Background scheduler stopped")
