#!/bin/bash

# Exit script if no backup file set in environment
if [ -z "$IMPORT_BACKUP_FILE" ]; then
    echo "[LOAD_BACKUP_SCRIPT] Loading Backup disabled!"
    exit 0
fi

echo "[LOAD_BACKUP_SCRIPT] Starting Load-Backup-Script..."

cp "/tmp/backups/" "/var/opt/gitlab" -r

# Wait for GitLab to be fully up and ready
until (curl -s http://localhost/users/sign_in | grep 'type="password"' > /dev/null); do
  echo "[LOAD_BACKUP_SCRIPT] Waiting for GitLab to be ready..."
  sleep 5
done

sleep 15

echo "[LOAD_BACKUP_SCRIPT] GitLab is ready, starting restore file '$IMPORT_BACKUP_FILE'..."

# Restore the GitLab backup
GITLAB_ASSUME_YES=1 gitlab-backup restore BACKUP=$(basename "$IMPORT_BACKUP_FILE" _gitlab_backup.tar)

echo "[LOAD_BACKUP_SCRIPT] Done!"
