#!/bin/bash

# Trading Platform - Database Backup Script
# Creates automated backups and uploads to S3

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y%m%d)
LOG_FILE="/var/log/trading-platform/backup-${TIMESTAMP}.log"

# Database configuration
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-trading_platform}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-trading_platform}"

# Redis configuration
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Create backup directory
create_backup_dir() {
    BACKUP_PATH="$BACKUP_DIR/$DATE"
    mkdir -p "$BACKUP_PATH"
    log "Backup directory: $BACKUP_PATH"
}

# Backup PostgreSQL database
backup_postgres() {
    log "Starting PostgreSQL backup..."
    
    local backup_file="$BACKUP_PATH/postgres_${DB_NAME}_${TIMESTAMP}.sql.gz"
    
    # Create backup
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-owner \
        --no-acl \
        2>> "$LOG_FILE" | gzip > "$backup_file"
    
    if [[ $? -eq 0 ]]; then
        local size=$(du -h "$backup_file" | cut -f1)
        success "PostgreSQL backup completed: $backup_file ($size)"
    else
        error "PostgreSQL backup failed"
        return 1
    fi
}

# Backup Redis data
backup_redis() {
    log "Starting Redis backup..."
    
    local backup_file="$BACKUP_PATH/redis_${TIMESTAMP}.rdb"
    
    # Trigger BGSAVE
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE 2>> "$LOG_FILE"
    
    # Wait for save to complete
    sleep 5
    
    # Copy RDB file
    docker cp "trading-platform-redis:/data/dump.rdb" "$backup_file" 2>> "$LOG_FILE" || {
        warning "Redis backup via docker cp failed, trying alternative method..."
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$backup_file" 2>> "$LOG_FILE"
    }
    
    if [[ -f "$backup_file" ]]; then
        local size=$(du -h "$backup_file" | cut -f1)
        success "Redis backup completed: $backup_file ($size)"
    else
        error "Redis backup failed"
        return 1
    fi
}

# Backup application files
backup_application() {
    log "Starting application files backup..."
    
    local backup_file="$BACKUP_PATH/application_${TIMESTAMP}.tar.gz"
    
    # Backup important files
    tar -czf "$backup_file" \
        -C /opt/trading-platform \
        .env \
        docker/docker-compose.yml \
        nginx/ \
        2>> "$LOG_FILE" || true
    
    if [[ -f "$backup_file" ]]; then
        local size=$(du -h "$backup_file" | cut -f1)
        success "Application backup completed: $backup_file ($size)"
    else
        warning "Application backup failed or no files to backup"
    fi
}

# Upload to S3
upload_to_s3() {
    if [[ -z "$S3_BUCKET" ]]; then
        warning "S3 bucket not configured, skipping upload"
        return 0
    fi
    
    log "Uploading backups to S3..."
    
    local s3_path="s3://$S3_BUCKET/backups/$DATE/"
    
    # Upload all backup files
    for file in "$BACKUP_PATH"/*; do
        if [[ -f "$file" ]]; then
            local filename=$(basename "$file")
            log "Uploading $filename..."
            
            aws s3 cp "$file" "$s3_path$filename" --storage-class STANDARD_IA 2>> "$LOG_FILE"
            
            if [[ $? -eq 0 ]]; then
                success "Uploaded: $filename"
            else
                error "Failed to upload: $filename"
            fi
        fi
    done
    
    success "S3 upload completed"
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."
    
    local postgres_backup=$(ls -t "$BACKUP_PATH"/postgres_*.sql.gz 2>/dev/null | head -1)
    
    if [[ -n "$postgres_backup" ]]; then
        # Test gzip integrity
        if gzip -t "$postgres_backup" 2>/dev/null; then
            success "Backup integrity verified"
        else
            error "Backup integrity check failed"
            return 1
        fi
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
    
    # Local cleanup
    find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "*.rdb" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Remove empty directories
    find "$BACKUP_DIR" -type d -empty -delete 2>/dev/null || true
    
    # S3 cleanup (if configured)
    if [[ -n "$S3_BUCKET" ]]; then
        log "Cleaning up old S3 backups..."
        
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
        
        aws s3 ls "s3://$S3_BUCKET/backups/" | while read -r line; do
            local folder_date=$(echo "$line" | awk '{print $1}' | tr -d '/')
            
            if [[ "$folder_date" =~ ^[0-9]{8}$ && "$folder_date" -lt "$cutoff_date" ]]; then
                log "Deleting old S3 backup: $folder_date"
                aws s3 rm "s3://$S3_BUCKET/backups/$folder_date/" --recursive 2>> "$LOG_FILE"
            fi
        done
    fi
    
    success "Cleanup completed"
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Trading Platform Backup: $status - $message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
    
    # Email notification
    if [[ -n "${ADMIN_EMAIL:-}" ]]; then
        echo "$message" | mail -s "Trading Platform Backup: $status" "$ADMIN_EMAIL" 2>/dev/null || true
    fi
}

# Create backup summary
create_summary() {
    local summary_file="$BACKUP_PATH/backup_summary_${TIMESTAMP}.txt"
    
    cat > "$summary_file" << EOF
Trading Platform Backup Summary
================================
Date: $(date)
Timestamp: $TIMESTAMP
Backup Path: $BACKUP_PATH

Backup Files:
$(ls -lh "$BACKUP_PATH")

Total Size: $(du -sh "$BACKUP_PATH" | cut -f1)

Database: $DB_NAME
S3 Bucket: ${S3_BUCKET:-"Not configured"}
Retention Days: $RETENTION_DAYS

Status: $1
EOF
    
    log "Backup summary created: $summary_file"
}

# Main backup function
main() {
    log "Starting backup process..."
    log "Backup directory: $BACKUP_DIR"
    log "Retention days: $RETENTION_DAYS"
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Create backup directory
    create_backup_dir
    
    # Run backup steps
    local backup_status="SUCCESS"
    local error_message=""
    
    if ! backup_postgres; then
        backup_status="FAILED"
        error_message="PostgreSQL backup failed"
    fi
    
    if ! backup_redis; then
        warning "Redis backup failed"
    fi
    
    backup_application
    
    if ! verify_backup; then
        backup_status="FAILED"
        error_message="Backup verification failed"
    fi
    
    if [[ "$backup_status" == "SUCCESS" ]]; then
        upload_to_s3
        cleanup_old_backups
        create_summary "SUCCESS"
        success "Backup process completed successfully!"
        send_notification "SUCCESS" "Backup completed at $(date)"
    else
        create_summary "FAILED"
        error "Backup process failed: $error_message"
        send_notification "FAILED" "Backup failed: $error_message"
        exit 1
    fi
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --s3-bucket BUCKET      S3 bucket for backup storage"
    echo "  --retention DAYS        Backup retention period in days (default: 30)"
    echo "  --db-host HOST          Database host (default: db)"
    echo "  --db-password PASS      Database password"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  BACKUP_DIR              Backup directory (default: /opt/backups)"
    echo "  BACKUP_S3_BUCKET        S3 bucket name"
    echo "  BACKUP_RETENTION_DAYS   Retention period in days"
    echo "  DB_PASSWORD             Database password"
    echo "  SLACK_WEBHOOK_URL       Slack webhook for notifications"
    echo "  ADMIN_EMAIL             Admin email for notifications"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --s3-bucket)
            S3_BUCKET="$2"
            shift 2
            ;;
        --retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        --db-host)
            DB_HOST="$2"
            shift 2
            ;;
        --db-password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function
main
