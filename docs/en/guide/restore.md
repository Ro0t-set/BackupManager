# Backup Restore

This guide explains how to restore backups for each supported database type.

## PostgreSQL

PostgreSQL backups are in **ZIP format** containing SQL files, universally compatible.

### Extract and restore

```bash
# 1. Extract ZIP file
unzip backup_file.zip

# 2. Restore database
psql -h localhost -p 5432 -U username -d database_name < backup_file.sql

# Or in a single command
unzip -p backup_file.zip | psql -h localhost -p 5432 -U username -d database_name
```

### Restore with options

```bash
# Verbose (show progress)
psql -h localhost -p 5432 -U username -d database_name -v ON_ERROR_STOP=1 < backup_file.sql

# With error logging
psql -h localhost -p 5432 -U username -d database_name < backup_file.sql 2> errors.log

# Environment variable for password
export PGPASSWORD='your_password'
unzip -p backup_file.zip | psql -h localhost -p 5432 -U username -d database_name
```

### Restore to new database

```bash
# Create database
createdb -h localhost -p 5432 -U username new_database

# Restore
unzip -p backup_file.zip | psql -h localhost -p 5432 -U username -d new_database
```

## MySQL

MySQL backups are in **ZIP format** containing SQL files, universally compatible.

### Extract and restore

```bash
# 1. Extract ZIP file
unzip backup_file.zip

# 2. Restore database
mysql -h localhost -P 3306 -u username -p database_name < backup_file.sql

# Or in a single command
unzip -p backup_file.zip | mysql -h localhost -P 3306 -u username -p database_name
```

### Restore with options

```bash
# Verbose (show progress)
mysql -h localhost -P 3306 -u username -p -v database_name < backup_file.sql

# With error logging
mysql -h localhost -P 3306 -u username -p database_name < backup_file.sql 2> errors.log

# Force execution even on errors
mysql -h localhost -P 3306 -u username -p --force database_name < backup_file.sql
```

### Restore to new database

```bash
# Create database
mysql -h localhost -P 3306 -u username -p -e "CREATE DATABASE new_database;"

# Restore
unzip -p backup_file.zip | mysql -h localhost -P 3306 -u username -p new_database
```

## MongoDB

MongoDB backups are in **ZIP format** containing the mongodump archive.

### Extract and restore

```bash
# 1. Extract ZIP file
unzip backup_file.zip -d backup_temp

# 2. Restore database
mongorestore --host localhost:27017 --username username --password password --db database_name backup_temp/database_name
```

### Restore with options

```bash
# Drop existing collections before restore
mongorestore --host localhost:27017 --db database_name --drop backup_temp/database_name

# Restore to database with different name
mongorestore --host localhost:27017 --db new_database_name backup_temp/old_database_name

# Restore specific collection
mongorestore --host localhost:27017 --db database_name --collection collection_name backup_temp/database_name/collection_name.bson
```

### Restore with authentication

```bash
# With credentials
mongorestore --host localhost:27017 \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --db database_name \
  backup_temp/database_name

# With connection URI
mongorestore --uri "mongodb://username:password@localhost:27017/database_name" \
  backup_temp/database_name
```

## Redis

Redis backups are RDB files that can be restored in two ways:

### Method 1: Direct restore

```bash
# 1. Stop Redis
sudo systemctl stop redis

# 2. Replace dump.rdb file
sudo cp backup_file.rdb /var/lib/redis/dump.rdb
sudo chown redis:redis /var/lib/redis/dump.rdb

# 3. Restart Redis
sudo systemctl start redis
```

### Method 2: Import with redis-cli

```bash
# Load RDB file into running Redis
redis-cli --rdb backup_file.rdb
```

## Important Notes

### Security

- **Never restore unverified backups** in production
- **Always test backups** in staging environment first
- **Verify credentials** and required permissions
- **Backup before restore**: always backup current database before restoring

### Performance

- **PostgreSQL**: use `-j N` for parallel restore on large databases
- **MySQL**: consider temporarily disabling indexes for large restores
- **MongoDB**: use `--numParallelCollections` for parallel restores

### Version Compatibility

- Ensure **database version** of destination is compatible with backup
- PostgreSQL custom format is compatible between close versions (e.g. 13-15)
- MySQL SQL dump is generally compatible between versions
- MongoDB archive may require similar mongorestore versions

## Restore Automation

### PostgreSQL restore script

```bash
#!/bin/bash
BACKUP_FILE=$1
DB_NAME=$2

if [ -z "$BACKUP_FILE" ] || [ -z "$DB_NAME" ]; then
    echo "Usage: $0 <backup_file> <database_name>"
    exit 1
fi

echo "Restoring backup $BACKUP_FILE to $DB_NAME..."
pg_restore -h localhost -p 5432 -U postgres -d $DB_NAME --clean --if-exists -j 4 $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Restore completed successfully"
else
    echo "❌ Error during restore"
    exit 1
fi
```

### MySQL restore script

```bash
#!/bin/bash
BACKUP_ZIP=$1
DB_NAME=$2

if [ -z "$BACKUP_ZIP" ] || [ -z "$DB_NAME" ]; then
    echo "Usage: $0 <backup_zip> <database_name>"
    exit 1
fi

echo "Extracting and restoring backup $BACKUP_ZIP to $DB_NAME..."
unzip -p $BACKUP_ZIP | mysql -h localhost -P 3306 -u root -p $DB_NAME

if [ $? -eq 0 ]; then
    echo "✅ Restore completed successfully"
else
    echo "❌ Error during restore"
    exit 1
fi
```

## Troubleshooting

### PostgreSQL

**Error: "role does not exist"**
```bash
# Use --no-owner to ignore original owners
pg_restore --no-owner --no-acl ...
```

**Error: "database is being accessed by other users"**
```bash
# Disconnect all users before restore
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='database_name';"
```

### MySQL

**Error: "Access denied"**
```bash
# Verify user privileges
GRANT ALL PRIVILEGES ON database_name.* TO 'username'@'localhost';
FLUSH PRIVILEGES;
```

**Error: "Unknown database"**
```bash
# Create database before restore
mysql -e "CREATE DATABASE database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### MongoDB

**Error: "Authentication failed"**
```bash
# Specify authentication database
mongorestore --authenticationDatabase admin ...
```

**Error: "Namespace exists"**
```bash
# Use --drop to overwrite existing collections
mongorestore --drop ...
```
