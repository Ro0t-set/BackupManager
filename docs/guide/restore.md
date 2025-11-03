# Ripristino Backup

Questa guida spiega come ripristinare i backup per ogni tipo di database supportato.

## PostgreSQL

I backup PostgreSQL sono in formato **ZIP** contenente file SQL, universalmente compatibile.

### Estrazione e ripristino

```bash
# 1. Estrai il file ZIP
unzip backup_file.zip

# 2. Ripristina il database
psql -h localhost -p 5432 -U username -d database_name < backup_file.sql

# Oppure in un comando unico
unzip -p backup_file.zip | psql -h localhost -p 5432 -U username -d database_name
```

### Ripristino con opzioni

```bash
# Verbose (mostra progresso)
psql -h localhost -p 5432 -U username -d database_name -v ON_ERROR_STOP=1 < backup_file.sql

# Con log degli errori
psql -h localhost -p 5432 -U username -d database_name < backup_file.sql 2> errors.log

# Variabile di ambiente per password
export PGPASSWORD='your_password'
unzip -p backup_file.zip | psql -h localhost -p 5432 -U username -d database_name
```

### Ripristino su database nuovo

```bash
# Crea il database
createdb -h localhost -p 5432 -U username new_database

# Ripristina
unzip -p backup_file.zip | psql -h localhost -p 5432 -U username -d new_database
```

## MySQL

I backup MySQL sono in formato **ZIP** contenente file SQL, universalmente compatibile.

### Estrazione e ripristino

```bash
# 1. Estrai il file ZIP
unzip backup_file.zip

# 2. Ripristina il database
mysql -h localhost -P 3306 -u username -p database_name < backup_file.sql

# Oppure in un comando unico
unzip -p backup_file.zip | mysql -h localhost -P 3306 -u username -p database_name
```

### Ripristino con opzioni

```bash
# Verbose (mostra progresso)
mysql -h localhost -P 3306 -u username -p -v database_name < backup_file.sql

# Con log degli errori
mysql -h localhost -P 3306 -u username -p database_name < backup_file.sql 2> errors.log

# Forza esecuzione anche in caso di errori
mysql -h localhost -P 3306 -u username -p --force database_name < backup_file.sql
```

### Ripristino su database nuovo

```bash
# Crea il database
mysql -h localhost -P 3306 -u username -p -e "CREATE DATABASE new_database;"

# Ripristina
unzip -p backup_file.zip | mysql -h localhost -P 3306 -u username -p new_database
```

## MongoDB

I backup MongoDB sono in formato **ZIP** contenente l'archivio mongodump.

### Estrazione e ripristino

```bash
# 1. Estrai il file ZIP
unzip backup_file.zip -d backup_temp

# 2. Ripristina il database
mongorestore --host localhost:27017 --username username --password password --db database_name backup_temp/database_name
```

### Ripristino con opzioni

```bash
# Drop delle collezioni esistenti prima del ripristino
mongorestore --host localhost:27017 --db database_name --drop backup_temp/database_name

# Ripristino su database con nome diverso
mongorestore --host localhost:27017 --db new_database_name backup_temp/old_database_name

# Ripristino di una collezione specifica
mongorestore --host localhost:27017 --db database_name --collection collection_name backup_temp/database_name/collection_name.bson
```

### Ripristino con autenticazione

```bash
# Con credenziali
mongorestore --host localhost:27017 \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --db database_name \
  backup_temp/database_name

# Con URI di connessione
mongorestore --uri "mongodb://username:password@localhost:27017/database_name" \
  backup_temp/database_name
```

## Redis

I backup Redis sono file RDB che possono essere ripristinati in due modi:

### Metodo 1: Ripristino diretto

```bash
# 1. Ferma Redis
sudo systemctl stop redis

# 2. Sostituisci il file dump.rdb
sudo cp backup_file.rdb /var/lib/redis/dump.rdb
sudo chown redis:redis /var/lib/redis/dump.rdb

# 3. Riavvia Redis
sudo systemctl start redis
```

### Metodo 2: Import con redis-cli

```bash
# Carica il file RDB in Redis in esecuzione
redis-cli --rdb backup_file.rdb
```

## Note Importanti

### Sicurezza

- **Mai ripristinare backup non verificati** in produzione
- **Testa sempre i backup** in ambiente di staging prima
- **Verifica le credenziali** e i permessi necessari
- **Backup prima del ripristino**: fai sempre un backup del database corrente prima di ripristinare

### Performance

- **PostgreSQL**: usa `-j N` per ripristino parallelo su database grandi
- **MySQL**: considera di disabilitare temporaneamente gli indici per ripristini grandi
- **MongoDB**: usa `--numParallelCollections` per ripristini paralleli

### Compatibilità Versioni

- Assicurati che la **versione del database** di destinazione sia compatibile con quella del backup
- PostgreSQL custom format è compatibile tra versioni vicine (es. 13-15)
- MySQL SQL dump è generalmente compatibile tra versioni
- MongoDB archive può richiedere versioni simili di mongorestore

## Automazione Restore

### Script di restore PostgreSQL

```bash
#!/bin/bash
BACKUP_FILE=$1
DB_NAME=$2

if [ -z "$BACKUP_FILE" ] || [ -z "$DB_NAME" ]; then
    echo "Usage: $0 <backup_file> <database_name>"
    exit 1
fi

echo "Ripristino backup $BACKUP_FILE in $DB_NAME..."
pg_restore -h localhost -p 5432 -U postgres -d $DB_NAME --clean --if-exists -j 4 $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Ripristino completato con successo"
else
    echo "❌ Errore durante il ripristino"
    exit 1
fi
```

### Script di restore MySQL

```bash
#!/bin/bash
BACKUP_ZIP=$1
DB_NAME=$2

if [ -z "$BACKUP_ZIP" ] || [ -z "$DB_NAME" ]; then
    echo "Usage: $0 <backup_zip> <database_name>"
    exit 1
fi

echo "Estrazione e ripristino backup $BACKUP_ZIP in $DB_NAME..."
unzip -p $BACKUP_ZIP | mysql -h localhost -P 3306 -u root -p $DB_NAME

if [ $? -eq 0 ]; then
    echo "✅ Ripristino completato con successo"
else
    echo "❌ Errore durante il ripristino"
    exit 1
fi
```

## Troubleshooting

### PostgreSQL

**Errore: "role does not exist"**
```bash
# Usa --no-owner per ignorare i proprietari originali
pg_restore --no-owner --no-acl ...
```

**Errore: "database is being accessed by other users"**
```bash
# Disconnetti tutti gli utenti prima del ripristino
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='database_name';"
```

### MySQL

**Errore: "Access denied"**
```bash
# Verifica i privilegi dell'utente
GRANT ALL PRIVILEGES ON database_name.* TO 'username'@'localhost';
FLUSH PRIVILEGES;
```

**Errore: "Unknown database"**
```bash
# Crea il database prima del ripristino
mysql -e "CREATE DATABASE database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### MongoDB

**Errore: "Authentication failed"**
```bash
# Specifica il database di autenticazione
mongorestore --authenticationDatabase admin ...
```

**Errore: "Namespace exists"**
```bash
# Usa --drop per sovrascrivere le collezioni esistenti
mongorestore --drop ...
```
