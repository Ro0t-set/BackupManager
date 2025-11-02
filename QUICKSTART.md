# Quick Start Guide

Get BackupManager up and running in 5 minutes!

## Option 1: Docker (Easiest)

### Prerequisites
- Docker Desktop installed
- Docker Compose installed

### Steps

1. **Clone and navigate**
   ```bash
   cd BackupManager
   ```

2. **Start services**
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

That's it!

## Option 2: Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL client (for PostgreSQL backups)
- MySQL client (for MySQL backups)

### Steps

1. **Run setup script**
   ```bash
   chmod +x scripts/dev-setup.sh
   ./scripts/dev-setup.sh
   ```

2. **Start backend** (Terminal 1)
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload
   ```

3. **Start frontend** (Terminal 2)
   ```bash
   cd frontend
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Next Steps

### 1. Create Admin User

```bash
./scripts/create-admin.sh
```

Default credentials:
- Email: `admin@backupmanager.local`
- Password: `admin123`

**Important:** Change the password after first login!

### 2. Configure Your First Backup

1. Log in to the web interface
2. Create a new project
3. Add a database connection
4. Configure a backup schedule
5. Test with a manual backup

### 3. Configure Backup Storage

Edit `backend/.env`:
```env
BACKUP_BASE_PATH=/path/to/your/backup/storage
```

### 4. Database Client Tools

Make sure you have the required database clients installed:

**macOS:**
```bash
# PostgreSQL
brew install postgresql

# MySQL
brew install mysql-client

# MongoDB
brew install mongodb-database-tools

# Redis
brew install redis
```

**Ubuntu/Debian:**
```bash
sudo apt install postgresql-client mysql-client mongodb-clients redis-tools
```

## Troubleshooting

### Docker Issues

**Port already in use:**
```bash
# Change ports in docker-compose.dev.yml
ports:
  - "8001:8000"  # Backend (change 8000 to 8001)
  - "5174:5173"  # Frontend (change 5173 to 5174)
```

**Container won't start:**
```bash
# View logs
./scripts/docker-logs.sh

# Clean and rebuild
./scripts/docker-clean.sh
./scripts/docker-build.sh
```

### Local Development Issues

**Python dependencies fail:**
```bash
# Upgrade pip
pip install --upgrade pip

# Install one by one to find the issue
pip install -r backend/requirements.txt -v
```

**Frontend build fails:**
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Issues

1. Ensure the database server is running
2. Check credentials in the database configuration
3. Verify network connectivity
4. Check firewall rules

### Backup Failures

1. Verify database client tools are installed
2. Check disk space in backup destination
3. Ensure write permissions on backup directory
4. Review backup logs in the UI

## Configuration Tips

### Cron Expressions

Common schedules:
- `0 2 * * *` - Daily at 2:00 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 0 1 * *` - Monthly on the 1st at midnight

Use [crontab.guru](https://crontab.guru/) to build expressions.

### Retention Policies

Set `retention_days` in your schedule to automatically delete old backups:
- 7 days - For development databases
- 30 days - For production daily backups
- 90 days - For monthly archives

### Multiple Backup Destinations

Configure multiple paths for redundancy:
```json
{
  "backup_destinations": [
    "/backups/local/",
    "/mnt/nas/backups/",
    "/mnt/external-drive/backups/"
  ]
}
```

## Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment guide.

## Getting Help

- Read the [README.md](README.md)
- Report issues on GitHub
- Check existing GitHub Discussions
- API Documentation: http://localhost:8000/docs
