#!/usr/bin/env bash
# ==============================================================================
# ROUTINE BACKUP SCRIPT FOR N8N DATABASE & WORKFLOWS
# Can be added to root crontab: 0 2 * * * /path/to/backup_n8n.sh
# ==============================================================================

set -euo pipefail

BACKUP_DIR="/var/backups/n8n"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

echo "💾 Starting n8n backup at $(date)..."

# 1. Dump PostgreSQL Database
if sudo docker ps --format '{{.Names}}' | grep -q "jobsearch_postgres"; then
    echo "Dumping PostgreSQL database..."
    sudo docker exec jobsearch_postgres pg_dump -U n8n -d n8n | gzip > "${BACKUP_DIR}/n8n_db_${TIMESTAMP}.sql.gz"
fi

# 2. Archive n8n data directory
if sudo docker volume inspect jobsearch_n8n_data &> /dev/null; then
    echo "Archiving n8n volume data..."
    sudo tar -czf "${BACKUP_DIR}/n8n_data_${TIMESTAMP}.tar.gz" -C /var/lib/docker/volumes/jobsearch_n8n_data/_data . 2>/dev/null || true
fi

# 3. Prune backups older than 14 days
find "$BACKUP_DIR" -type f -name "n8n_*" -mtime +14 -delete

echo "✅ Backup successfully saved to ${BACKUP_DIR}."

# Optional: Sync to AWS S3 bucket if configured
# S3_BUCKET="s3://your-n8n-backups-bucket"
# if command -v aws &> /dev/null; then
#     aws s3 sync "$BACKUP_DIR" "$S3_BUCKET"
#     echo "☁️ Synced backups to AWS S3."
# fi
