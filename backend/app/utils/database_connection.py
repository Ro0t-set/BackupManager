"""
Database connection testing utilities
Supports: MySQL, PostgreSQL, MongoDB, SQLite, Redis
"""
import os
from typing import Dict, Tuple


def test_mysql_connection(host: str, port: int, username: str, password: str, database: str) -> Tuple[bool, str]:
    """Test MySQL/MariaDB connection"""
    try:
        import pymysql
        
        connection = pymysql.connect(
            host=host,
            port=port,
            user=username,
            password=password,
            database=database,
            connect_timeout=5
        )
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()[0]
        
        connection.close()
        return True, f"Connection successful! MySQL version: {version}"
        
    except ImportError:
        return False, "PyMySQL library not installed. Install with: pip install pymysql"
    except Exception as e:
        return False, f"Connection failed: {str(e)}"


def test_postgresql_connection(host: str, port: int, username: str, password: str, database: str) -> Tuple[bool, str]:
    """Test PostgreSQL connection"""
    try:
        import psycopg2
        
        connection = psycopg2.connect(
            host=host,
            port=port,
            user=username,
            password=password,
            database=database,
            connect_timeout=5
        )
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT version()")
            version = cursor.fetchone()[0]
        
        connection.close()
        return True, f"Connection successful! PostgreSQL version: {version[:50]}..."
        
    except ImportError:
        return False, "psycopg2 library not installed. Install with: pip install psycopg2-binary"
    except Exception as e:
        return False, f"Connection failed: {str(e)}"


def test_mongodb_connection(host: str, port: int, username: str, password: str, database: str) -> Tuple[bool, str]:
    """Test MongoDB connection"""
    try:
        from pymongo import MongoClient
        from pymongo.errors import ConnectionFailure, OperationFailure
        
        # Build connection string
        if username and password:
            connection_string = f"mongodb://{username}:{password}@{host}:{port}/{database}?authSource=admin"
        else:
            connection_string = f"mongodb://{host}:{port}/{database}"
        
        client = MongoClient(connection_string, serverSelectionTimeoutMS=5000)
        
        # Test connection
        client.admin.command('ping')
        server_info = client.server_info()
        version = server_info.get('version', 'unknown')
        
        client.close()
        return True, f"Connection successful! MongoDB version: {version}"
        
    except ImportError:
        return False, "pymongo library not installed. Install with: pip install pymongo"
    except (ConnectionFailure, OperationFailure) as e:
        return False, f"Connection failed: {str(e)}"
    except Exception as e:
        return False, f"Connection failed: {str(e)}"


def test_sqlite_connection(file_path: str) -> Tuple[bool, str]:
    """Test SQLite connection"""
    try:
        import sqlite3
        
        # Check if file exists
        if not os.path.exists(file_path):
            return False, f"Database file not found: {file_path}"
        
        connection = sqlite3.connect(file_path, timeout=5)
        cursor = connection.cursor()
        cursor.execute("SELECT sqlite_version()")
        version = cursor.fetchone()[0]
        connection.close()
        
        return True, f"Connection successful! SQLite version: {version}"
        
    except Exception as e:
        return False, f"Connection failed: {str(e)}"


def test_redis_connection(host: str, port: int, password: str = None, database: int = 0) -> Tuple[bool, str]:
    """Test Redis connection"""
    try:
        import redis
        
        client = redis.Redis(
            host=host,
            port=port,
            password=password if password else None,
            db=database,
            socket_connect_timeout=5,
            decode_responses=True
        )
        
        # Test connection
        client.ping()
        info = client.info('server')
        version = info.get('redis_version', 'unknown')
        
        client.close()
        return True, f"Connection successful! Redis version: {version}"
        
    except ImportError:
        return False, "redis library not installed. Install with: pip install redis"
    except Exception as e:
        return False, f"Connection failed: {str(e)}"


def test_database_connection(
    db_type: str,
    host: str,
    port: int,
    username: str,
    password: str,
    database: str,
    additional_params: Dict = None
) -> Tuple[bool, str]:
    """
    Universal database connection tester
    
    Args:
        db_type: Type of database (mysql, postgresql, mongodb, sqlite, redis)
        host: Database host
        port: Database port
        username: Database username
        password: Database password (decrypted)
        database: Database name
        additional_params: Additional connection parameters
        
    Returns:
        Tuple of (success: bool, message: str)
    """
    db_type_lower = db_type.lower()
    
    try:
        if db_type_lower in ['mysql', 'mariadb']:
            return test_mysql_connection(host, port, username, password, database)
            
        elif db_type_lower == 'postgresql':
            return test_postgresql_connection(host, port, username, password, database)
            
        elif db_type_lower == 'mongodb':
            return test_mongodb_connection(host, port, username, password, database)
            
        elif db_type_lower == 'sqlite':
            # For SQLite, the 'host' field contains the file path
            return test_sqlite_connection(host)
            
        elif db_type_lower == 'redis':
            # Redis database is a number (0-15)
            db_number = int(database) if database.isdigit() else 0
            return test_redis_connection(host, port, password, db_number)
            
        else:
            return False, f"Unsupported database type: {db_type}"
            
    except Exception as e:
        return False, f"Unexpected error: {str(e)}"
