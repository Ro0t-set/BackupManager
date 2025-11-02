---
title: Getting Started
---

This guide covers installation and first run of the application.

## Prerequisites

- macOS, Linux, or Windows
- Docker (recommended for rapid development) or Python 3.11+
- Node.js 18+ (for frontend and documentation)

## Quick Start with Docker

1. Run the setup script and create admin user:
2. Start Backend and Frontend stacks:

```bash
# from project root
./scripts/dev-setup.sh
docker compose -f docker-compose.dev.yml up --build
```

The app will be available on the frontend portal (see nginx.conf) and the FastAPI backend on the configured port.

## Running Without Docker (Development)

Backend (FastAPI):

```bash
# from project root
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

## Project Structure

- `backend/` — FastAPI API, scheduler, models and migrations (alembic)
- `frontend/` — React interface (Vite + Tailwind)
- `scripts/` — Utility scripts (setup, migrations, build)

Continue with details on [Backend](/guide/backend) and [Frontend](/guide/frontend).
