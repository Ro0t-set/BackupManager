---
title: Backend
---

Il backend è scritto in FastAPI e organizza API, scheduler e gestione backup.

## Struttura principale

- `backend/app/main.py` — entrypoint FastAPI
- `backend/app/core/` — configurazioni core (database, sicurezza, scheduler, cifratura)
- `backend/app/api/routes/` — router per risorse (auth, backups, databases, destinations, groups, ...)
- `backend/app/models/` — modelli SQLAlchemy
- `backend/app/schemas/` — schemi Pydantic
- `backend/app/utils/` — utilità (esecuzione backup, connessione DB, verifica file)
- `backend/alembic/` — migrazioni DB

## Esecuzione locale

```bash
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

## Migrazioni (Alembic)

Script utili:

```bash
# genera una nuova migrazione
./scripts/generate-migration.sh "descrizione"

# applica le migrazioni
alembic -c backend/alembic.ini upgrade head
```

## Scheduler e Backup

La logica di pianificazione/avvio backup risiede in `backend/app/core/scheduler.py` e utility correlate in `backend/app/utils/`.
Consulta anche `backend/MULTI_DESTINATION_BACKUPS.md` per il design multi-destinazione.
