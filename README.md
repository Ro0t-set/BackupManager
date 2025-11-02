# BackupManager 🗄️

A powerful, full-stack web application for managing automated backups across multiple database systems.

## Features

- 🎯 **Multi-Database Support**: PostgreSQL, MySQL, MongoDB, Redis
- 📅 **Flexible Scheduling**: Cron-based automated backups
- 🔐 **Secure Credentials**: Encrypted database passwords using Fernet
- 📊 **Dashboard & Analytics**: Track backup status and storage usage
- 🔄 **Manual Triggers**: On-demand backup execution
- 🗂️ **Multi-Destination**: Save backups to multiple locations
- ♻️ **Retention Policies**: Automatic cleanup of old backups
- 🚀 **Modern Stack**: FastAPI backend + React frontend

## Tech Stack

**Backend:**
- FastAPI
- SQLAlchemy
- SQLite (application database)
- Custom scheduler with croniter
- JWT authentication
- Fernet encryption

**Frontend:**
- React 18
- Vite
- TailwindCSS
- React Router
- Axios

## Quick Start

### Prerequisites

- Docker & Docker Compose
- OR: Python 3.11+, Node.js 20+

### Using Docker (Recommended)

1. **Clone the repository:**
```bash
git clone <repository-url>
cd BackupManager
```

2. **Configure environment:**
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. **Generate encryption key:**
```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
Add the output to `backend/.env` as `ENCRYPTION_KEY`

4. **Start services:**
```bash
# Production mode
docker-compose up -d

# Development mode (with hot reload)
docker-compose -f docker-compose.dev.yml up
```

5. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Local Development

#### Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set SECRET_KEY, ENCRYPTION_KEY

# Run migrations (when available)
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development server
npm run dev
```

## Project Structure

```
backup-manager/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── api/          # API routes
│   │   ├── core/         # Core logic (scheduler, adapters)
│   │   └── utils/        # Utilities
│   ├── alembic/          # Database migrations
│   └── tests/            # Backend tests
├── frontend/             # React frontend
│   └── src/
│       ├── components/   # React components
│       ├── pages/        # Page components
│       ├── services/     # API services
│       └── hooks/        # Custom hooks
├── backups/              # Backup files storage
└── scripts/              # Utility scripts
```

## Utility Scripts

### Backend

```bash
# Initialize database
./scripts/init-db.sh

# Create admin user
./scripts/create-admin.sh

# Run tests
./scripts/test-backend.sh

# Generate migration
./scripts/generate-migration.sh "migration_name"
```

### Frontend

```bash
# Run linter
./scripts/lint-frontend.sh

# Build production
./scripts/build-frontend.sh
```

### Docker

```bash
# Build images
./scripts/docker-build.sh

# View logs
./scripts/docker-logs.sh

# Clean up
./scripts/docker-clean.sh
```

## Configuration

### Environment Variables

**Backend (.env):**
```env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=your-secret-key
ENCRYPTION_KEY=your-fernet-key
BACKUP_BASE_PATH=./backups
CORS_ORIGINS=["http://localhost:3000"]
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:8000/api
```

## Database Adapters

Current supported databases:

- **PostgreSQL**: Uses `pg_dump`
- **MySQL**: Uses `mysqldump`
- **MongoDB**: Uses `mongodump`
- **Redis**: Uses `redis-cli --rdb`

Each adapter handles:
- Connection testing
- Backup execution
- Compression
- Error handling
- Timeout management

## API Documentation

Interactive API documentation available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Roadmap

- [ ] Implement core backend models and API
- [ ] Build database adapters
- [ ] Create custom scheduler
- [ ] Develop frontend components
- [ ] Add email notifications
- [ ] Implement backup restore functionality
- [ ] Add incremental backups
- [ ] Cloud storage integration (S3, Azure Blob)
- [ ] Webhook support
- [ ] Multi-user management
- [ ] Backup encryption

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Create an issue]
- Documentation: [Wiki]

---

**Note**: This project is in active development. Some features may not be fully implemented yet.

## Documentation (VitePress + GitHub Pages)

La documentazione ufficiale è in `docs/` (VitePress) ed è pubblicata automaticamente su GitHub Pages.

Sviluppo locale della doc:

```bash
cd docs
npm install
npm run docs:dev
```

Build/preview locale:

```bash
npm run docs:build
npm run docs:preview
```

Deploy automatico:

- Un push su `main` che modifica `docs/**` attiva il workflow "Deploy Docs (VitePress)" che builda e pubblica su GitHub Pages.
- Il dominio personalizzato è `www.tommasopatriti.me` (incluso nel build tramite `docs/public/CNAME`).
- Assicurati di avere un record DNS CNAME: `www` → `ro0t-set.github.io` e di impostare in GitHub → Settings → Pages la sorgente "GitHub Actions" e il Custom domain `www.tommasopatriti.me` (con TLS automatico).
