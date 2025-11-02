---
title: Backend
---

The backend is written in FastAPI and organizes API, scheduler, and backup management.

## Main Structure

- `backend/app/main.py` — FastAPI entry point
- `backend/app/core/` — Core configurations (database, security, scheduler, encryption)
- `backend/app/api/routes/` — Resource routers (auth, backups, databases, destinations, groups, etc.)
- `backend/app/models/` — SQLAlchemy models
- `backend/app/schemas/` — Pydantic schemas
- `backend/app/utils/` — Utilities (backup execution, DB connection, file verification)
- `backend/alembic/` — Database migrations

## Local Execution

```bash
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

## Migrations (Alembic)

Useful scripts:

```bash
# generate a new migration
./scripts/generate-migration.sh "description"

# apply migrations
alembic -c backend/alembic.ini upgrade head
```

## Scheduler and Backup

The scheduling and backup execution logic resides in `backend/app/core/scheduler.py` and related utilities in `backend/app/utils/`.
See also `backend/MULTI_DESTINATION_BACKUPS.md` for the multi-destination design.
