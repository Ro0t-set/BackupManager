# Database Details Endpoint - Documentazione

## Panoramica

È stato implementato un nuovo endpoint backend che fornisce informazioni complete e dettagliate su un database specifico, inclusi schedules, backup recenti e verifica dei file.

## Endpoint

### GET `/api/databases/{database_id}/details`

Restituisce informazioni complete su un database specifico.

#### Parametri

- `database_id` (int, path): ID del database da recuperare

#### Autenticazione

Richiede token JWT valido (Bearer token)

#### Response Schema: `DatabaseDetailResponse`

```json
{
  // Informazioni base del database
  "id": 1,
  "name": "Production PostgreSQL",
  "description": "Main production database",
  "db_type": "postgresql",
  "host": "localhost",
  "port": 5432,
  "username": "postgres",
  "database_name": "myapp_prod",
  "group_id": 1,
  "group_name": "Production",
  "is_active": true,
  "created_by": 1,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-15T10:30:00Z",
  "last_backup_at": "2025-11-02T08:00:00Z",
  
  // Statistiche generali
  "total_backups": 150,
  "successful_backups": 145,
  "failed_backups": 5,
  "total_backup_size": 5368709120,  // bytes
  
  // Lista di tutti gli schedules con statistiche
  "schedules": [
    {
      "id": 1,
      "name": "Daily Backup",
      "description": "Backup giornaliero alle 2 AM",
      "schedule_type": "cron",
      "cron_expression": "0 2 * * *",
      "interval_value": null,
      "retention_days": 30,
      "max_backups": 45,
      "is_active": true,
      "last_run_at": "2025-11-02T02:00:00Z",
      "next_run_at": "2025-11-03T02:00:00Z",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-15T10:30:00Z",
      // Statistiche per questo schedule
      "total_backups": 120,
      "successful_backups": 118,
      "failed_backups": 2
    }
  ],
  
  // Ultimi 10 backup con verifica file
  "recent_backups": [
    {
      "id": 150,
      "name": "production_postgresql_20251102_080000",
      "database_id": 1,
      "schedule_id": 1,
      "file_path": "production/postgresql/production_postgresql_20251102_080000.sql.gz",
      "file_size": 35840000,  // Size stored in DB
      "status": "completed",
      "error_message": null,
      "started_at": "2025-11-02T08:00:00Z",
      "completed_at": "2025-11-02T08:05:30Z",
      "duration_seconds": 330,
      "created_at": "2025-11-02T08:00:00Z",
      "storage_type": "local",
      "is_compressed": true,
      "compression_type": "gzip",
      
      // Verifica file su disco
      "file_info": {
        "exists": true,
        "file_path": "production/postgresql/production_postgresql_20251102_080000.sql.gz",
        "absolute_path": "/app/backups/production/postgresql/production_postgresql_20251102_080000.sql.gz",
        "file_size_on_disk": 35842048,  // Actual size on disk
        "is_accessible": true,
        "error_message": null
      }
    },
    {
      "id": 149,
      "name": "production_postgresql_20251101_080000",
      "status": "failed",
      "error_message": "Connection timeout after 300 seconds",
      "file_info": null  // No file info for failed backups
    }
  ]
}
```

## Caratteristiche Implementate

### 1. **Statistiche Complete**
- Numero totale di backup (tutti gli stati)
- Backup completati con successo
- Backup falliti
- Dimensione totale dei backup (solo completati)

### 2. **Informazioni Schedules**
Per ogni schedule associato al database:
- Configurazione completa (cron, retention, ecc.)
- Statistiche specifiche (backup totali, successi, fallimenti)
- Tempi di ultima esecuzione e prossima esecuzione

### 3. **Backup Recenti con Verifica File**
Gli ultimi 10 backup vengono restituiti con:
- Informazioni complete dal database
- **Verifica fisica del file** per backup completati:
  - Esistenza del file
  - Path assoluto risolto
  - Dimensione reale su disco
  - Accessibilità (permessi di lettura)
  - Messaggi di errore se il file non è accessibile

### 4. **Utility di Verifica File**

Il modulo `app/utils/file_verification.py` fornisce funzioni per:

#### `verify_backup_file(file_path, base_path)`
Verifica l'esistenza e l'accessibilità di un file backup.

**Caratteristiche:**
- Gestisce path relativi e assoluti
- Usa `BACKUP_BASE_PATH` da environment o default `./backups`
- Verifica esistenza, tipo (file vs directory), dimensione
- Tenta l'accesso in lettura per verificare permessi
- Gestisce eccezioni e fornisce messaggi d'errore dettagliati

#### `verify_backup_directory(base_path)`
Verifica la directory dei backup e fornisce info su spazio disco.

#### `format_file_size(size_bytes)`
Formatta le dimensioni in formato human-readable (KB, MB, GB, ecc.)

#### `get_backup_base_path()`
Ottiene il base path dei backup da environment variable

## Modelli Pydantic Aggiunti

### `BackupFileInfo`
Informazioni sulla verifica fisica del file backup.

### `BackupDetailItem`
Backup completo con informazioni di verifica file.

### `ScheduleDetailItem`
Schedule con statistiche sui backup associati.

### `DatabaseDetailResponse`
Response principale che unisce tutte le informazioni.

## Utilizzo nell'API

```bash
# Esempio richiesta
curl -X GET "http://localhost:8000/api/databases/1/details" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Casi d'Uso Frontend

Questo endpoint permette di:

1. **Visualizzare Dashboard Database**: Mostrare tutte le info del database in una singola vista
2. **Monitoraggio Backup**: Vedere lo stato dei backup recenti e se i file esistono
3. **Gestione Schedules**: Visualizzare tutti gli schedules configurati con le loro performance
4. **Alert Automatici**: Rilevare backup falliti o file mancanti
5. **Statistiche**: Grafici e metriche su successo/fallimento dei backup

## Esempio Implementazione Frontend (React)

```jsx
const DatabaseDetailPage = ({ databaseId }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      const response = await api.get(`/databases/${databaseId}/details`);
      setDetails(response.data);
      setLoading(false);
    };
    fetchDetails();
  }, [databaseId]);

  if (loading) return <Loader />;

  return (
    <div>
      <DatabaseHeader database={details} />
      
      <Stats
        totalBackups={details.total_backups}
        successRate={details.successful_backups / details.total_backups * 100}
        totalSize={formatFileSize(details.total_backup_size)}
      />
      
      <SchedulesSection schedules={details.schedules} />
      
      <RecentBackupsSection 
        backups={details.recent_backups}
        // Mostra icona di warning se file_info.exists === false
      />
    </div>
  );
};
```

## Prossimi Passi

1. ✅ Schema Pydantic implementato
2. ✅ Utility di verifica file creata
3. ✅ Endpoint backend implementato
4. ⏳ Creare componente React per visualizzare i dettagli
5. ⏳ Implementare UI per schedules
6. ⏳ Implementare tabella backup recenti con indicatori di stato file

## Note Tecniche

- L'endpoint usa una query SQL singola per ottenere il database
- Le statistiche sono calcolate con query aggregate per performance
- La verifica file è eseguita solo per backup completati
- I path sono normalizzati e risolti a path assoluti
- Gestione errori robusta per file mancanti o inaccessibili
- Supporto per environment variables (`BACKUP_BASE_PATH`)

## Sicurezza

- Autenticazione JWT obbligatoria
- Verifica permessi utente (future: controllo permessi per gruppo)
- Password del database non restituita (encrypted in DB)
- Validazione ID database esistente
- Gestione sicura degli accessi ai file (solo lettura, no execution)
