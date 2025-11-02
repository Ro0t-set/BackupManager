---
title: Backend
---

The backend is built with FastAPI and handles APIs, scheduling and backup management.

## Main structure

- `backend/app/main.py` — FastAPI entrypoint
- `backend/app/core/` — core configs (database, security, scheduler, encryption)
- `backend/app/api/routes/` — routers for resources (auth, backups, databases, destinations, groups, ...)
- `backend/app/models/` — SQLAlchemy models
- `backend/app/schemas/` — Pydantic schemas
- `backend/app/utils/` — utilities (backup execution, DB connection, file verification)
- `backend/alembic/` — DB migrations

## Local run

```bash
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

## Migrations (Alembic)

```bash
./scripts/generate-migration.sh "description"
alembic -c backend/alembic.ini upgrade head
```

## Scheduler & Backups

Scheduling/backup logic is in `backend/app/core/scheduler.py` and helpers under `backend/app/utils/`.
See also `backend/MULTI_DESTINATION_BACKUPS.md` for the multi-destination design.
