---
layout: home
hero:
  name: BackupManager
  text: Gestione automatizzata dei backup
  tagline: FastAPI + React • multi-destinazione • pianificazione • verifica integrità
  actions:
    - theme: brand
      text: Inizia ora
      link: /guide/getting-started
    - theme: alt
      text: Repository
      link: https://github.com/Ro0t-set/BackupManager
features:
  - title: 📅 Pianificazione Automatica
    details: Scheduler integrato con supporto cron per backup regolari, gestione delle finestre temporali e pianificazione flessibile. Configura backup giornalieri, settimanali o mensili con precisione al minuto.
  - title: 🗂️ Multi-destinazione
    details: Invia i backup simultaneamente verso storage multipli (locale, S3, Azure Blob, NFS). Design estendibile via adapter pattern per aggiungere facilmente nuove destinazioni. Ridondanza garantita per la sicurezza dei dati.
  - title: 🔐 Sicurezza & Integrità
    details: Cifratura automatica delle credenziali con Fernet, verifica hash dei file backup, compressione intelligente e checksum per garantire l'integrità dei dati. Protezione end-to-end per i tuoi backup critici.
  - title: 📊 Dashboard & Monitoraggio
    details: Interfaccia intuitiva per monitorare lo stato dei backup in tempo reale, visualizzare statistiche di storage, tracciare la cronologia completa e ricevere notifiche su successi o errori.
  - title: 🎯 Supporto Multi-Database
    details: Backup nativi per PostgreSQL, MySQL, MongoDB e Redis. Ogni adapter ottimizzato per il rispettivo database con supporto per dump completi, gestione delle connessioni e test di connettività.
  - title: ♻️ Retention Policy
    details: Gestione automatica della retention con pulizia intelligente dei backup obsoleti. Configura politiche personalizzate per giorni di conservazione, spazio massimo e numero di backup da mantenere.
---

## Cos'è BackupManager?

BackupManager è una piattaforma per orchestrare backup di database e file, con un backend in FastAPI e un frontend in React (Vite), pensata per ambienti multi-destinazione e con scheduler integrato.

Per iniziare vai alla guida rapida: [Inizia ora](/guide/getting-started).

### Anteprima

![Dashboard](./img/dashboard.png)

![Connessioni DB](./img/db.png)
