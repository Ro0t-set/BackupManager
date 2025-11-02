---
layout: home
hero:
  name: BackupManager
  text: Automated backup management
  tagline: FastAPI + React • multi-destination • scheduling • integrity checks
  actions:
    - theme: brand
      text: Get Started
      link: /en/guide/getting-started
    - theme: alt
      text: Repository
      link: https://github.com/Ro0t-set/BackupManager
features:
  - title: 📅 Automatic Scheduling
    details: Integrated scheduler with cron support for regular backups, time window management, and flexible planning. Configure daily, weekly, or monthly backups with minute-level precision.
  - title: 🗂️ Multi-destination
    details: Send backups simultaneously to multiple storage locations (local, S3, Azure Blob, NFS). Extensible design via adapter pattern to easily add new destinations. Guaranteed redundancy for data safety.
  - title: 🔐 Security & Integrity
    details: Automatic credential encryption with Fernet, backup file hash verification, intelligent compression, and checksums to ensure data integrity. End-to-end protection for your critical backups.
  - title: 📊 Dashboard & Monitoring
    details: Intuitive interface to monitor backup status in real-time, view storage statistics, track complete history, and receive notifications on success or failure.
  - title: 🎯 Multi-Database Support
    details: Native backups for PostgreSQL, MySQL, MongoDB, and Redis. Each adapter optimized for its respective database with support for full dumps, connection management, and connectivity testing.
  - title: ♻️ Retention Policy
    details: Automatic retention management with intelligent cleanup of obsolete backups. Configure custom policies for retention days, maximum space, and number of backups to keep.
---

## What is BackupManager?

BackupManager orchestrates backups for databases and files with a FastAPI backend and a React (Vite) frontend, designed for multi-destination targets and integrated scheduling.

### Preview

![Dashboard](../img/dashboard.png)

![DB Connections](../img/db.png)
