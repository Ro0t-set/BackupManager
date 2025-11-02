from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Dict, Any
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.database import Database
from app.models.backup import Backup, BackupStatus
from app.models.group import Group
from app.models.schedule import Schedule

router = APIRouter()


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get comprehensive dashboard statistics including:
    - Overall metrics (total databases, backups, storage)
    - Recent backups
    - Success rate
    - Group-wise statistics
    """
    
    # Get user's groups
    user_groups = db.query(Group).filter(Group.created_by == current_user.id).all()
    group_ids = [g.id for g in user_groups]
    
    # Overall Statistics
    total_databases = db.query(Database).filter(
        Database.group_id.in_(group_ids),
        Database.is_active == True
    ).count()
    
    total_backups = db.query(Backup).join(Database).filter(
        Database.group_id.in_(group_ids)
    ).count()
    
    # Storage used (sum of all backup file sizes)
    total_storage = db.query(func.sum(Backup.file_size)).join(Database).filter(
        Database.group_id.in_(group_ids),
        Backup.file_size.isnot(None)
    ).scalar() or 0
    
    # Backup success rate - SOLO sui backup attualmente esistenti (non eliminati dalla retention)
    # Questi sono i backup che "dovrebbero" essere presenti secondo le policy
    current_backups = db.query(Backup).join(Database).filter(
        Database.group_id.in_(group_ids)
    ).all()
    
    total_current = len(current_backups)
    successful_current = sum(1 for b in current_backups if b.status == BackupStatus.COMPLETED)
    success_rate = (successful_current / total_current * 100) if total_current > 0 else 0
    
    # Recent backups (last 3)
    recent_backups_list = db.query(Backup).join(Database).filter(
        Database.group_id.in_(group_ids)
    ).order_by(desc(Backup.created_at)).limit(3).all()
    
    recent_backups_data = []
    for backup in recent_backups_list:
        recent_backups_data.append({
            "id": backup.id,
            "name": backup.name,
            "database_id": backup.database_id,
            "database_name": backup.database.name,
            "status": backup.status.value,
            "created_at": backup.created_at.isoformat() if backup.created_at else None,
            "file_size": backup.file_size,
            "duration_seconds": backup.duration_seconds
        })
    
    # Active schedules count
    total_schedules = db.query(Schedule).join(Database).filter(
        Database.group_id.in_(group_ids),
        Schedule.is_active == True
    ).count()
    
    # Failed backups count - SOLO sui backup attualmente esistenti
    failed_backups_count = sum(1 for b in current_backups if b.status == BackupStatus.FAILED)
    
    # Group-wise statistics
    group_stats = []
    for group in user_groups:
        group_databases = db.query(Database).filter(
            Database.group_id == group.id,
            Database.is_active == True
        ).all()
        
        group_backup_count = 0
        group_storage = 0
        group_last_backup = None
        group_success_count = 0
        group_total_count = 0
        
        for database in group_databases:
            # Count backups for this database - SOLO backup attualmente esistenti
            db_backups = db.query(Backup).filter(
                Backup.database_id == database.id
            ).all()
            
            group_backup_count += len(db_backups)
            group_total_count += len(db_backups)
            group_success_count += sum(1 for b in db_backups if b.status == BackupStatus.COMPLETED)
            
            # Sum storage for this database
            db_storage = db.query(func.sum(Backup.file_size)).filter(
                Backup.database_id == database.id,
                Backup.file_size.isnot(None)
            ).scalar() or 0
            group_storage += db_storage
            
            # Get last backup for this database
            last_backup = db.query(Backup).filter(
                Backup.database_id == database.id
            ).order_by(desc(Backup.created_at)).first()
            
            if last_backup and (not group_last_backup or last_backup.created_at > group_last_backup):
                group_last_backup = last_backup.created_at
        
        group_success_rate = (group_success_count / group_total_count * 100) if group_total_count > 0 else 0

        group_stats.append({
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "database_count": len(group_databases),
            "backup_count": group_backup_count,
            "storage_used": group_storage,
            "success_rate": round(group_success_rate, 1),
            "last_backup_at": group_last_backup.isoformat() if group_last_backup else None
        })
    
    # Backup trends (last 7 days)
    backup_trends = []
    for i in range(6, -1, -1):
        day = datetime.now() - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        day_backups = db.query(Backup).join(Database).filter(
            Database.group_id.in_(group_ids),
            Backup.created_at >= day_start,
            Backup.created_at < day_end
        ).all()
        
        successful = sum(1 for b in day_backups if b.status == BackupStatus.COMPLETED)
        failed = sum(1 for b in day_backups if b.status == BackupStatus.FAILED)
        
        backup_trends.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "total": len(day_backups),
            "successful": successful,
            "failed": failed
        })
    
    return {
        "overview": {
            "total_databases": total_databases,
            "total_backups": total_backups,
            "total_storage": total_storage,
            "total_schedules": total_schedules,
            "success_rate": round(success_rate, 1),
            "failed_backups": failed_backups_count
        },
        "recent_backups": recent_backups_data,
        "groups": group_stats,
        "trends": backup_trends
    }
