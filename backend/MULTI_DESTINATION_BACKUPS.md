# Multi-Destination Backups - Documentazione Completa

## 📋 Panoramica

Il sistema BackupManager supporta **backup multi-destinazione**, permettendo di salvare ogni backup in più posizioni contemporaneamente (es: disco locale + disco esterno + cloud storage).

## 🎯 Caratteristiche Principali

### 1. **Multiple Destinazioni per Backup**
- Un singolo backup può essere salvato in N destinazioni diverse
- Ogni destinazione ha il proprio stato (pending, uploading, completed, failed)
- Verifica file indipendente per ogni destinazione

### 2. **Tipi di Storage Supportati**
```python
class StorageType(Enum):
    LOCAL = "local"                    # Disco locale principale
    LOCAL_EXTERNAL = "local_external"  # Disco esterno, NAS, ecc.
    S3 = "s3"                          # Amazon S3
    MINIO = "minio"                    # MinIO S3-compatible
    SPACES = "spaces"                  # DigitalOcean Spaces
    BACKBLAZE = "backblaze"            # Backblaze B2
    AZURE_BLOB = "azure_blob"          # Azure Blob Storage
    GCS = "gcs"                        # Google Cloud Storage
```

### 3. **Priorità Destinazioni**
- Ogni destinazione ha un campo `priority` (default: 0)
- Priorità più bassa = eseguita per prima
- Utile per definire l'ordine di backup (es: locale prima, poi cloud)

### 4. **Tracking Indipendente**
Ogni destinazione traccia:
- ✅ Status specifico (pending/uploading/completed/failed)
- ✅ Dimensione file (può variare per compressione/ottimizzazione)
- ✅ Checksum (verifica integrità)
- ✅ Tempi di upload (started_at, completed_at, duration)
- ✅ Messaggi di errore specifici
- ✅ Verifica fisica del file su disco

## 📊 Struttura Database

### Tabella: `backup_destinations`

```sql
CREATE TABLE backup_destinations (
    id INTEGER PRIMARY KEY,
    backup_id INTEGER NOT NULL,  -- FK a backups.id (CASCADE DELETE)
    
    -- Storage configuration
    storage_type VARCHAR NOT NULL,
    storage_name VARCHAR,         -- Nome descrittivo (es: "Backup HDD Esterno")
    file_path TEXT NOT NULL,      -- Path relativo o chiave S3
    base_path TEXT,               -- Path base (es: /mnt/external_hdd)
    storage_config TEXT,          -- JSON con config (bucket, region, ecc.)
    
    -- File info
    file_size BIGINT,
    checksum VARCHAR,
    
    -- Status tracking
    status VARCHAR NOT NULL,      -- pending|uploading|completed|failed
    error_message TEXT,
    
    -- Timing
    upload_started_at TIMESTAMP,
    upload_completed_at TIMESTAMP,
    upload_duration_seconds INTEGER,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    priority INTEGER DEFAULT 0,
    
    FOREIGN KEY (backup_id) REFERENCES backups(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX ix_backup_destinations_backup_id ON backup_destinations(backup_id);
CREATE INDEX ix_backup_destinations_storage_type ON backup_destinations(storage_type);
CREATE INDEX ix_backup_destinations_status ON backup_destinations(status);
```

### Tabella: `backups` (modificata)

I campi `storage_type`, `file_path`, `file_size`, `checksum` sono ora **NULLABLE** e **DEPRECATI**.
Vengono mantenuti solo per backward compatibility con backup esistenti.

I nuovi backup usano la relationship `destinations` → `BackupDestination`.

## 🔌 API Endpoints

### GET `/api/databases/{database_id}/details`

Response include array di destinazioni per ogni backup:

```json
{
  "recent_backups": [
    {
      "id": 150,
      "name": "production_postgresql_20251102_080000",
      "status": "completed",
      
      // Array di destinazioni con verifica file
      "destinations": [
        {
          "id": 301,
          "storage_type": "local",
          "storage_name": "Main Storage",
          "file_path": "production/postgresql/backup_20251102_080000.sql.gz",
          "base_path": "/app/backups",
          "file_size": 35840000,
          "checksum": "a3f2b1c4d5...",
          "status": "completed",
          "priority": 0,
          "upload_duration_seconds": 45,
          
          // Verifica file fisica
          "file_info": {
            "exists": true,
            "absolute_path": "/app/backups/production/postgresql/backup_20251102_080000.sql.gz",
            "file_size_on_disk": 35842048,
            "is_accessible": true,
            "error_message": null
          }
        },
        {
          "id": 302,
          "storage_type": "local_external",
          "storage_name": "External HDD Backup",
          "file_path": "backups/production/backup_20251102_080000.sql.gz",
          "base_path": "/mnt/external_hdd",
          "file_size": 35840000,
          "status": "completed",
          "priority": 1,
          "upload_duration_seconds": 120,
          
          "file_info": {
            "exists": true,
            "absolute_path": "/mnt/external_hdd/backups/production/backup_20251102_080000.sql.gz",
            "file_size_on_disk": 35842048,
            "is_accessible": true
          }
        },
        {
          "id": 303,
          "storage_type": "s3",
          "storage_name": "AWS S3 Backup",
          "file_path": "backups/2025/11/02/backup_20251102_080000.sql.gz",
          "file_size": 35840000,
          "status": "completed",
          "priority": 2,
          "upload_duration_seconds": 180,
          "storage_config": "{\"bucket\":\"my-backups\",\"region\":\"us-east-1\"}",
          
          "file_info": null  // Non applicabile per S3
        }
      ],
      
      // Legacy fields (per backward compatibility)
      "storage_type": "local",
      "file_path": "production/postgresql/backup_20251102_080000.sql.gz",
      "file_size": 35840000
    }
  ]
}
```

## 🔄 Migration dei Dati

La migration `001_add_backup_destinations.py` gestisce:

### Upgrade (applicazione)
1. ✅ Crea tabella `backup_destinations`
2. ✅ Crea indici per performance
3. ✅ **Migra automaticamente i backup esistenti**:
   - Per ogni backup con `file_path` non null
   - Crea un record `BackupDestination` corrispondente
   - Copia: storage_type, file_path, file_size, checksum, timing
   - Assegna priority = 0
   - Storage name = "Primary Storage (migrated)"
4. ✅ Rende nullable i campi legacy in `backups`

### Downgrade (rollback)
⚠️ **ATTENZIONE**: Perdita dati se ci sono backup multi-destinazione!

1. Copia la **prima destinazione** (priority più bassa) nei campi legacy di `backups`
2. Elimina tutte le altre destinazioni
3. Ripristina NOT NULL sui campi legacy
4. Droppa tabella `backup_destinations`

## 💻 Utilizzo nel Codice

### Creare Backup Multi-Destinazione

```python
from app.models.backup import Backup
from app.models.backup_destination import BackupDestination, StorageType, DestinationStatus

# Crea il backup principale
backup = Backup(
    name="db_backup_20251102_080000",
    database_id=1,
    status=BackupStatus.IN_PROGRESS,
    created_by=user_id,
    is_compressed=True,
    compression_type="gzip"
)
db.add(backup)
db.flush()  # Ottieni l'ID del backup

# Aggiungi destinazione locale
dest_local = BackupDestination(
    backup_id=backup.id,
    storage_type=StorageType.LOCAL,
    storage_name="Main Storage",
    file_path="backups/2025/11/02/backup.sql.gz",
    base_path="/app/backups",
    status=DestinationStatus.PENDING,
    priority=0
)

# Aggiungi destinazione disco esterno
dest_external = BackupDestination(
    backup_id=backup.id,
    storage_type=StorageType.LOCAL_EXTERNAL,
    storage_name="External HDD",
    file_path="postgresql_backups/backup.sql.gz",
    base_path="/mnt/external_hdd",
    status=DestinationStatus.PENDING,
    priority=1
)

# Aggiungi destinazione S3
dest_s3 = BackupDestination(
    backup_id=backup.id,
    storage_type=StorageType.S3,
    storage_name="AWS S3 Backup",
    file_path="backups/2025/11/02/backup.sql.gz",
    storage_config='{"bucket": "my-backups", "region": "us-east-1"}',
    status=DestinationStatus.PENDING,
    priority=2
)

db.add_all([dest_local, dest_external, dest_s3])
db.commit()
```

### Query Backup con Destinazioni

```python
# Ottieni backup con tutte le destinazioni
backup = db.query(Backup).filter(Backup.id == backup_id).first()

# Accedi alle destinazioni
for destination in backup.destinations:
    print(f"Storage: {destination.storage_type}")
    print(f"Status: {destination.status}")
    print(f"Path: {destination.file_path}")
    
    # Verifica file se completato
    if destination.status == DestinationStatus.COMPLETED:
        file_info = verify_backup_file(
            destination.file_path, 
            base_path=destination.base_path
        )
        print(f"File exists: {file_info['exists']}")
```

## 🎨 Frontend UI Suggestions

### Visualizzazione Destinazioni

```jsx
const BackupDestinations = ({ destinations }) => {
  return (
    <div className="space-y-2">
      {destinations.map(dest => (
        <div key={dest.id} className="flex items-center gap-2">
          <StorageIcon type={dest.storage_type} />
          <span>{dest.storage_name || dest.storage_type}</span>
          
          {/* Status badge */}
          <Badge variant={dest.status === 'completed' ? 'success' : 'warning'}>
            {dest.status}
          </Badge>
          
          {/* File verification indicator */}
          {dest.file_info && (
            dest.file_info.exists && dest.file_info.is_accessible ? (
              <CheckCircle className="text-green-500" />
            ) : (
              <AlertTriangle className="text-red-500" />
            )
          )}
        </div>
      ))}
    </div>
  );
};
```

## ⚡ Performance

### Ottimizzazioni Implementate

1. **Indexes su colonne frequenti**:
   - `backup_id` (FK lookups)
   - `storage_type` (filtraggio per tipo)
   - `status` (filtraggio per stato)

2. **Cascade DELETE**:
   - Eliminando un backup, tutte le destinazioni vengono eliminate automaticamente

3. **Query con JOIN**:
   ```python
   backups = db.query(Backup).options(
       joinedload(Backup.destinations)
   ).filter(Backup.database_id == db_id).all()
   ```

4. **Verifica file asincrona** (future):
   - Verificare file in background per non bloccare response
   - Cache dei risultati di verifica

## 🔐 Sicurezza

### Storage Config
Il campo `storage_config` può contenere info sensibili (credenziali, token).

**Best Practices**:
- ❌ NON salvare credenziali in plain text
- ✅ Usa riferimenti a vault/secrets manager
- ✅ Encrypta storage_config se contiene dati sensibili
- ✅ Esempio:
  ```json
  {
    "bucket": "my-backups",
    "region": "us-east-1",
    "credentials_ref": "aws_backup_user_secret_id"
  }
  ```

## 🚀 Prossimi Step

1. ✅ Modelli e migration implementati
2. ✅ Endpoint API aggiornato
3. ✅ Verifica file per multiple destinazioni
4. ⏳ Implementare upload effettivo verso destinazioni multiple
5. ⏳ Worker/queue per gestire upload asincroni
6. ⏳ Retry logic per destination upload falliti
7. ⏳ Dashboard frontend per visualizzare destinazioni
8. ⏳ UI per configurare destinazioni per database/schedule
9. ⏳ Monitoring e alerting per destination failures

## 📝 Note Tecniche

### Backward Compatibility
- I backup creati prima della migration continuano a funzionare
- Viene creata automaticamente una destinazione per ogni backup esistente
- I campi legacy (`storage_type`, `file_path`) rimangono nel modello ma sono deprecati

### Base Path
- `base_path` è importante per storage locali/esterni
- Permette di montare dischi esterni in posizioni diverse
- La verifica file usa: `Path(base_path) / file_path`

### Priority
- Priorità 0 = più alta (eseguita per prima)
- Utile per backup sequenziali (prima locale, poi upload cloud)
- Frontend può ordinare destinazioni per priority
