"""Add backup destinations for multi-destination support

Revision ID: 001_add_backup_destinations
Revises: 
Create Date: 2025-11-02 12:00:00.000000

This migration adds the backup_destinations table to support multiple storage
destinations for each backup (e.g., local drive + external HDD + cloud storage).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = '001_add_backup_destinations'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create backup_destinations table and migrate existing backup data.
    
    For existing backups with storage_type and file_path, create corresponding
    destination records to maintain backward compatibility.
    """
    # Create backup_destinations table
    op.create_table(
        'backup_destinations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('backup_id', sa.Integer(), nullable=False),
        sa.Column('storage_type', sa.Enum(
            'LOCAL', 'LOCAL_EXTERNAL', 'S3', 'MINIO', 'SPACES', 
            'BACKBLAZE', 'AZURE_BLOB', 'GCS',
            name='storagetype'
        ), nullable=False),
        sa.Column('storage_name', sa.String(), nullable=True),
        sa.Column('file_path', sa.Text(), nullable=False),
        sa.Column('base_path', sa.Text(), nullable=True),
        sa.Column('file_size', sa.BigInteger(), nullable=True),
        sa.Column('checksum', sa.String(), nullable=True),
        sa.Column('status', sa.Enum(
            'PENDING', 'UPLOADING', 'COMPLETED', 'FAILED',
            name='destinationstatus'
        ), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('upload_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('upload_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('upload_duration_seconds', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('storage_config', sa.Text(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=True, default=0),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['backup_id'], ['backups.id'], ondelete='CASCADE'),
    )
    
    # Create indexes for better query performance
    op.create_index('ix_backup_destinations_backup_id', 'backup_destinations', ['backup_id'])
    op.create_index('ix_backup_destinations_storage_type', 'backup_destinations', ['storage_type'])
    op.create_index('ix_backup_destinations_status', 'backup_destinations', ['status'])
    
    # Migrate existing backup data to destinations
    # This creates a destination record for each existing backup that has storage_type and file_path
    connection = op.get_bind()
    
    # Get all existing backups with storage info
    existing_backups = connection.execute(
        sa.text("""
            SELECT id, storage_type, file_path, file_size, checksum, status, 
                   started_at, completed_at, duration_seconds
            FROM backups 
            WHERE file_path IS NOT NULL AND file_path != ''
        """)
    ).fetchall()
    
    # Create destination records for existing backups
    for backup in existing_backups:
        # Map backup status to destination status
        dest_status = 'COMPLETED' if backup.status == 'completed' else backup.status.upper()
        if dest_status not in ['PENDING', 'UPLOADING', 'COMPLETED', 'FAILED']:
            dest_status = 'COMPLETED' if backup.status == 'completed' else 'FAILED'
        
        connection.execute(
            sa.text("""
                INSERT INTO backup_destinations 
                (backup_id, storage_type, storage_name, file_path, file_size, checksum, 
                 status, upload_started_at, upload_completed_at, upload_duration_seconds, priority)
                VALUES 
                (:backup_id, :storage_type, :storage_name, :file_path, :file_size, :checksum,
                 :status, :started_at, :completed_at, :duration_seconds, 0)
            """),
            {
                'backup_id': backup.id,
                'storage_type': backup.storage_type.upper() if backup.storage_type else 'LOCAL',
                'storage_name': 'Primary Storage (migrated)',
                'file_path': backup.file_path,
                'file_size': backup.file_size,
                'checksum': backup.checksum,
                'status': dest_status,
                'started_at': backup.started_at,
                'completed_at': backup.completed_at,
                'duration_seconds': backup.duration_seconds
            }
        )
    
    # Make old storage fields nullable for backward compatibility
    # These fields are kept but deprecated in favor of destinations relationship
    with op.batch_alter_table('backups', schema=None) as batch_op:
        batch_op.alter_column('storage_type',
                              existing_type=sa.Enum('LOCAL', 'S3', 'MINIO', 'SPACES', 'BACKBLAZE', name='storagetype'),
                              nullable=True)
        batch_op.alter_column('file_path',
                              existing_type=sa.Text(),
                              nullable=True)


def downgrade() -> None:
    """
    Remove backup_destinations table and restore old single-destination structure.
    
    WARNING: This will lose data if backups have multiple destinations!
    Only the first destination will be preserved in the backup record.
    """
    connection = op.get_bind()
    
    # Restore file_path and storage_type to backups from first destination (priority 0)
    connection.execute(
        sa.text("""
            UPDATE backups
            SET storage_type = (
                SELECT storage_type 
                FROM backup_destinations 
                WHERE backup_destinations.backup_id = backups.id 
                ORDER BY priority ASC 
                LIMIT 1
            ),
            file_path = (
                SELECT file_path 
                FROM backup_destinations 
                WHERE backup_destinations.backup_id = backups.id 
                ORDER BY priority ASC 
                LIMIT 1
            ),
            file_size = (
                SELECT file_size 
                FROM backup_destinations 
                WHERE backup_destinations.backup_id = backups.id 
                ORDER BY priority ASC 
                LIMIT 1
            ),
            checksum = (
                SELECT checksum 
                FROM backup_destinations 
                WHERE backup_destinations.backup_id = backups.id 
                ORDER BY priority ASC 
                LIMIT 1
            )
            WHERE EXISTS (
                SELECT 1 
                FROM backup_destinations 
                WHERE backup_destinations.backup_id = backups.id
            )
        """)
    )
    
    # Make fields NOT NULL again
    with op.batch_alter_table('backups', schema=None) as batch_op:
        batch_op.alter_column('storage_type',
                              existing_type=sa.Enum('LOCAL', 'S3', 'MINIO', 'SPACES', 'BACKBLAZE', name='storagetype'),
                              nullable=False)
        batch_op.alter_column('file_path',
                              existing_type=sa.Text(),
                              nullable=False)
    
    # Drop indexes
    op.drop_index('ix_backup_destinations_status', table_name='backup_destinations')
    op.drop_index('ix_backup_destinations_storage_type', table_name='backup_destinations')
    op.drop_index('ix_backup_destinations_backup_id', table_name='backup_destinations')
    
    # Drop table
    op.drop_table('backup_destinations')
