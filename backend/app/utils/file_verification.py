"""
Utility functions for verifying backup files on disk
"""
import os
from pathlib import Path
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


def verify_backup_file(file_path: str, base_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Verify if a backup file exists and is accessible
    
    Args:
        file_path: Relative or absolute path to the backup file
        base_path: Base directory for backups (from env or config)
        
    Returns:
        Dictionary with file information:
        - exists: bool
        - file_path: str (original path)
        - absolute_path: str (resolved absolute path)
        - file_size_on_disk: int (actual size in bytes)
        - is_accessible: bool
        - error_message: str (if any error occurred)
    """
    result = {
        "exists": False,
        "file_path": file_path,
        "absolute_path": None,
        "file_size_on_disk": None,
        "is_accessible": False,
        "error_message": None
    }
    
    try:
        # Handle absolute and relative paths
        if os.path.isabs(file_path):
            full_path = Path(file_path)
        else:
            # Use base_path if provided, otherwise use default
            if base_path:
                full_path = Path(base_path) / file_path
            else:
                # Try to get from environment or use default
                default_base = os.getenv("BACKUP_BASE_PATH", "./backups")
                full_path = Path(default_base) / file_path
        
        result["absolute_path"] = str(full_path.resolve())
        
        # Check if file exists
        if full_path.exists():
            result["exists"] = True
            
            # Check if it's a file (not a directory)
            if full_path.is_file():
                try:
                    # Get actual file size
                    result["file_size_on_disk"] = full_path.stat().st_size
                    
                    # Try to access the file to verify permissions
                    with open(full_path, 'rb') as f:
                        # Just try to read first byte to verify access
                        f.read(1)
                    
                    result["is_accessible"] = True
                    
                except PermissionError:
                    result["error_message"] = "File exists but access denied (permission error)"
                    logger.warning(f"Permission denied for backup file: {full_path}")
                    
                except Exception as e:
                    result["error_message"] = f"File exists but error reading it: {str(e)}"
                    logger.error(f"Error accessing backup file {full_path}: {str(e)}")
            else:
                result["error_message"] = "Path exists but is not a file"
                logger.warning(f"Backup path is not a file: {full_path}")
        else:
            result["error_message"] = "File does not exist"
            
    except Exception as e:
        result["error_message"] = f"Error verifying file: {str(e)}"
        logger.error(f"Unexpected error verifying backup file {file_path}: {str(e)}")
    
    return result


def get_backup_base_path() -> str:
    """
    Get the base path for backups from environment or use default
    
    Returns:
        Base path for backup files
    """
    return os.getenv("BACKUP_BASE_PATH", "./backups")


def format_file_size(size_bytes: Optional[int]) -> str:
    """
    Format file size in human-readable format
    
    Args:
        size_bytes: Size in bytes
        
    Returns:
        Formatted string (e.g., "1.5 MB", "500 KB")
    """
    if size_bytes is None:
        return "Unknown"
    
    if size_bytes == 0:
        return "0 B"
    
    units = ["B", "KB", "MB", "GB", "TB"]
    unit_index = 0
    size = float(size_bytes)
    
    while size >= 1024 and unit_index < len(units) - 1:
        size /= 1024
        unit_index += 1
    
    if unit_index == 0:
        return f"{int(size)} {units[unit_index]}"
    else:
        return f"{size:.2f} {units[unit_index]}"


def verify_backup_directory(base_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Verify if the backup directory exists and is writable
    
    Args:
        base_path: Base directory for backups
        
    Returns:
        Dictionary with directory verification info
    """
    if not base_path:
        base_path = get_backup_base_path()
    
    result = {
        "path": base_path,
        "exists": False,
        "is_writable": False,
        "total_space_bytes": None,
        "used_space_bytes": None,
        "free_space_bytes": None,
        "error_message": None
    }
    
    try:
        path = Path(base_path)
        
        if path.exists():
            result["exists"] = True
            
            # Check if writable
            result["is_writable"] = os.access(path, os.W_OK)
            
            # Get disk space info
            if hasattr(os, 'statvfs'):  # Unix-like systems
                stat = os.statvfs(path)
                result["total_space_bytes"] = stat.f_blocks * stat.f_frsize
                result["free_space_bytes"] = stat.f_bavail * stat.f_frsize
                result["used_space_bytes"] = result["total_space_bytes"] - result["free_space_bytes"]
            elif hasattr(os, 'path') and hasattr(os.path, 'splitdrive'):  # Windows
                import shutil
                total, used, free = shutil.disk_usage(path)
                result["total_space_bytes"] = total
                result["used_space_bytes"] = used
                result["free_space_bytes"] = free
        else:
            result["error_message"] = "Directory does not exist"
            
    except Exception as e:
        result["error_message"] = f"Error verifying directory: {str(e)}"
        logger.error(f"Error verifying backup directory {base_path}: {str(e)}")
    
    return result
