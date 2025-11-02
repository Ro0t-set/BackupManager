---
title: Getting Started
---

Questa guida ti porta dall'installazione locale al primo avvio dell'applicazione.

## Prerequisiti

- macOS, Linux o Windows
- Docker (consigliato per sviluppo rapido) oppure Python 3.11+
- Node.js 18+ (per il frontend e la documentazione)

## Avvio rapido con Docker

1. Esegui lo script di setup e crea l'utente admin:
2. Avvia gli stack di Backend e Frontend:

```bash
# dalla root del progetto
./scripts/dev-setup.sh
docker compose -f docker-compose.dev.yml up --build
```

L'app sarà disponibile sul portale frontend (vedi nginx.conf) e il backend FastAPI sulla porta configurata.

## Avvio senza Docker (sviluppo)

Backend (FastAPI):

```bash
# dalla root del progetto
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

## Struttura del progetto

- `backend/` — API in FastAPI, scheduler, modelli e migrazioni (alembic)
- `frontend/` — interfaccia React (Vite + Tailwind)
- `scripts/` — script di utilità (setup, migrazioni, build)

Prosegui con i dettagli su [Backend](/guide/backend) e [Frontend](/guide/frontend).
