"""
Backup execution utilities for different database types.
Handles creating dumps and copying to multiple destinations.
"""
import os
import subprocess
import shutil
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

from app.core.encryption import decrypt_password


def execute_postgres_backup(host: str, port: int, username: str, password: str,
                            database_name: str, output_file: str) -> Tuple[bool, str]:
    """Execute pg_dump for PostgreSQL backup"""
    try:
        env = os.environ.copy()
        env['PGPASSWORD'] = password

        cmd = [
            'pg_dump',
            '-h', host,
            '-p', str(port),
            '-U', username,
            '-F', 'c',  # Custom format
            '-b',  # Include blobs
            '-v',  # Verbose
            '-f', output_file,
            database_name
        ]

        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True,
            timeout=3600  # 1 hour timeout
        )

        if result.returncode == 0:
            return True, "Backup completed successfully"
        else:
            return False, result.stderr or "pg_dump failed"

    except subprocess.TimeoutExpired:
        return False, "Backup timed out after 1 hour"
    except Exception as e:
        return False, f"Backup failed: {str(e)}"


def execute_mysql_backup(host: str, port: int, username: str, password: str,
                         database_name: str, output_file: str) -> Tuple[bool, str]:
    """Execute mysqldump for MySQL backup"""
    try:
        cmd = [
            'mysqldump',
            '-h', host,
            '-P', str(port),
            '-u', username,
            f'-p{password}',
            '--single-transaction',
            '--routines',
            '--triggers',
            '--events',
            '--result-file', output_file,
            database_name
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=3600
        )

        if result.returncode == 0:
            return True, "Backup completed successfully"
        else:
            return False, result.stderr or "mysqldump failed"

    except subprocess.TimeoutExpired:
        return False, "Backup timed out after 1 hour"
    except Exception as e:
        return False, f"Backup failed: {str(e)}"


def execute_mongodb_backup(host: str, port: int, username: str, password: str,
                           database_name: str, output_dir: str) -> Tuple[bool, str]:
    """Execute mongodump for MongoDB backup"""
    try:
        cmd = [
            'mongodump',
            '--host', f"{host}:{port}",
            '--username', username,
            '--password', password,
            '--db', database_name,
            '--out', output_dir
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=3600
        )

        if result.returncode == 0:
            # Create tar archive
            archive_path = f"{output_dir}.tar.gz"
            shutil.make_archive(output_dir, 'gztar', output_dir)
            shutil.rmtree(output_dir)
            return True, f"Backup completed: {archive_path}"
        else:
            return False, result.stderr or "mongodump failed"

    except subprocess.TimeoutExpired:
        return False, "Backup timed out after 1 hour"
    except Exception as e:
        return False, f"Backup failed: {str(e)}"


def create_database_dump(db_type: str, host: str, port: int, username: str,
                        password_encrypted: str, database_name: str,
                        backup_name: str) -> Tuple[bool, str, str]:
    """
    Create a database dump file.
    Returns: (success, file_path, error_message)
    """
    # Create temp directory for dumps
    temp_dir = "/tmp/backups"
    os.makedirs(temp_dir, exist_ok=True)

    # Decrypt password
    password = decrypt_password(password_encrypted) if password_encrypted else ""

    # Add unique identifier to avoid conflicts between concurrent backups
    import uuid
    unique_id = str(uuid.uuid4())[:8]
    output_file = os.path.join(temp_dir, f"{backup_name}_{unique_id}.dump")

    try:
        if db_type.lower() == 'postgresql':
            success, message = execute_postgres_backup(
                host, port, username, password, database_name, output_file
            )
        elif db_type.lower() == 'mysql':
            success, message = execute_mysql_backup(
                host, port, username, password, database_name, output_file
            )
        elif db_type.lower() == 'mongodb':
            success, message = execute_mongodb_backup(
                host, port, username, password, database_name, output_file
            )
        else:
            return False, "", f"Unsupported database type: {db_type}"

        if success and os.path.exists(output_file):
            return True, output_file, message
        else:
            return False, "", message

    except Exception as e:
        return False, "", f"Dump creation failed: {str(e)}"


def copy_to_destinations(source_file: str, destinations: List,
                        project_name: str, database_name: str) -> Dict[str, dict]:
    """
    Copy backup file to all enabled destinations.
    Returns: {destination_path: {success, file_path, size_mb, error}}
    """
    results = {}
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    filename = os.path.basename(source_file)

    for destination in destinations:
        dest_path = destination.path

        try:
            # Create directory structure: {dest_path}/{project_name}/{database_name}/
            target_dir = os.path.join(dest_path, project_name, database_name)
            os.makedirs(target_dir, exist_ok=True)

            # Target file path
            target_file = os.path.join(target_dir, filename)

            # Check if destination is writable
            if not os.access(target_dir, os.W_OK):
                results[dest_path] = {
                    "success": False,
                    "file_path": None,
                    "size_mb": None,
                    "error": f"Destination not writable: {dest_path}"
                }
                continue

            # Check available space
            stat = shutil.disk_usage(target_dir)
            source_size = os.path.getsize(source_file)
            if stat.free < source_size * 1.1:  # Need 10% extra space
                results[dest_path] = {
                    "success": False,
                    "file_path": None,
                    "size_mb": None,
                    "error": f"Insufficient space at {dest_path}"
                }
                continue

            # Copy file
            shutil.copy2(source_file, target_file)

            # Verify copy
            if os.path.exists(target_file):
                file_size = os.path.getsize(target_file)
                size_mb = round(file_size / (1024 * 1024), 2)

                results[dest_path] = {
                    "success": True,
                    "file_path": target_file,
                    "size_mb": size_mb,
                    "error": None
                }
            else:
                results[dest_path] = {
                    "success": False,
                    "file_path": None,
                    "size_mb": None,
                    "error": "File copy verification failed"
                }

        except Exception as e:
            results[dest_path] = {
                "success": False,
                "file_path": None,
                "size_mb": None,
                "error": str(e)
            }

    return results


def determine_backup_status(destination_results: Dict[str, dict]) -> str:
    """
    Determine overall backup status based on destination results.
    Returns: 'completed', 'partial', or 'failed'
    """
    if not destination_results:
        return 'failed'

    success_count = sum(1 for r in destination_results.values() if r.get('success'))
    total_count = len(destination_results)

    if success_count == total_count:
        return 'completed'
    elif success_count > 0:
        return 'partial'
    else:
        return 'failed'
