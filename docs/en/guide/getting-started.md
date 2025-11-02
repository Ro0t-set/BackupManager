---
title: Getting Started
---

This guide takes you from local installation to the first run.

## Prerequisites

- macOS, Linux, or Windows
- Docker (recommended) or Python 3.11+
- Node.js 18+

## Quick start with Docker

```bash
# from the project root
./scripts/dev-setup.sh
docker compose -f docker-compose.dev.yml up --build
```

## Without Docker (dev)

Backend (FastAPI):

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend (Vite + React):

```bash
cd frontend
npm install
npm run dev
```

## Project structure

- `backend/` — FastAPI API, scheduler, models and migrations (alembic)
- `frontend/` — React interface (Vite + Tailwind)
- `scripts/` — utility scripts (setup, migrations, build)

Continue with [Backend](/en/guide/backend) and [Frontend](/en/guide/frontend).
