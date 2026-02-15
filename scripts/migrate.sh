#!/bin/bash

# Trading Platform - Database Migration Script
# Handles database migrations with safety checks and rollback capability

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="${COMPOSE_FILE:-docker/docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/trading-platform/migrate-${TIMESTAMP}.log"

# Database configuration
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-trading_platform}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-trading_platform}"

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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v docker-compose &> /dev/null; then
        error "docker-compose is not installed"
        exit 1
    fi
    
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    if [[ -z "$DB_PASSWORD" ]]; then
        error "Database password not provided"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Create pre-migration backup
backup_before_migration() {
    log "Creating pre-migration backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    local backup_file="$BACKUP_DIR/pre-migration-${TIMESTAMP}.sql.gz"
    
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
        success "Pre-migration backup created: $backup_file ($size)"
        echo "$backup_file" > /tmp/last_migration_backup
    else
        error "Pre-migration backup failed"
        exit 1
    fi
}

# Check migration status
check_migration_status() {
    log "Checking migration status..."
    
    docker-compose -f "$COMPOSE_FILE" run --rm app npx prisma migrate status 2>&1 | tee -a "$LOG_FILE"
    
    local status=${PIPESTATUS[0]}
    if [[ $status -eq 0 ]]; then
        success "Migration status check completed"
    else
        warning "Migration status check returned non-zero exit code"
    fi
}

# Deploy migrations
deploy_migrations() {
    log "Deploying migrations..."
    
    docker-compose -f "$COMPOSE_FILE" run --rm app npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"
    
    local status=${PIPESTATUS[0]}
    if [[ $status -eq 0 ]]; then
        success "Migrations deployed successfully"
    else
        error "Migration deployment failed"
        return 1
    fi
}

# Generate new migration
generate_migration() {
    local name="${1:-migration}"
    
    log "Generating new migration: $name"
    
    docker-compose -f "$COMPOSE_FILE" run --rm app npx prisma migrate dev --name "$name" --create-only 2>&1 | tee -a "$LOG_FILE"
    
    local status=${PIPESTATUS[0]}
    if [[ $status -eq 0 ]]; then
        success "Migration generated successfully"
        log "Review the migration file before deploying"
    else
        error "Migration generation failed"
        return 1
    fi
}

# Reset database (DANGEROUS - use with caution)
reset_database() {
    warning "This will DELETE ALL DATA in the database!"
    read -p "Are you sure you want to continue? Type 'RESET' to confirm: " confirm
    
    if [[ "$confirm" != "RESET" ]]; then
        log "Database reset cancelled"
        exit 0
    fi
    
    log "Resetting database..."
    
    docker-compose -f "$COMPOSE_FILE" run --rm app npx prisma migrate reset --force 2>&1 | tee -a "$LOG_FILE"
    
    local status=${PIPESTATUS[0]}
    if [[ $status -eq 0 ]]; then
        success "Database reset completed"
    else
        error "Database reset failed"
        return 1
    fi
}

# Rollback migration
rollback_migration() {
    log "Rolling back last migration..."
    
    local backup_file
    if [[ -f /tmp/last_migration_backup ]]; then
        backup_file=$(cat /tmp/last_migration_backup)
    else
        # Find the most recent backup
        backup_file=$(ls -t "$BACKUP_DIR"/pre-migration-*.sql.gz 2>/dev/null | head -1)
    fi
    
    if [[ -z "$backup_file" || ! -f "$backup_file" ]]; then
        error "No backup file found for rollback"
        exit 1
    fi
    
    log "Restoring from backup: $backup_file"
    
    # Restore database
    gunzip -c "$backup_file" | PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        2>> "$LOG_FILE"
    
    if [[ $? -eq 0 ]]; then
        success "Rollback completed successfully"
    else
        error "Rollback failed"
        return 1
    fi
}

# Validate migrations
validate_migrations() {
    log "Validating migrations..."
    
    docker-compose -f "$COMPOSE_FILE" run --rm app npx prisma validate 2>&1 | tee -a "$LOG_FILE"
    
    local status=${PIPESTATUS[0]}
    if [[ $status -eq 0 ]]; then
        success "Schema validation passed"
    else
        error "Schema validation failed"
        return 1
    fi
    
    # Check for migration conflicts
    docker-compose -f "$COMPOSE_FILE" run --rm app npx prisma migrate diff \
        --from-schema-datamodel prisma/schema.prisma \
        --to-schema-datasource prisma/schema.prisma 2>&1 | tee -a "$LOG_FILE"
    
    if [[ ${PIPESTATUS[0]} -eq 0 ]]; then
        success "No drift detected"
    else
        warning "Schema drift detected - migrations may be needed"
    fi
}

# Seed database
seed_database() {
    log "Seeding database..."
    
    docker-compose -f "$COMPOSE_FILE" run --rm app npx prisma db seed 2>&1 | tee -a "$LOG_FILE"
    
    local status=${PIPESTATUS[0]}
    if [[ $status -eq 0 ]]; then
        success "Database seeded successfully"
    else
        error "Database seeding failed"
        return 1
    fi
}

# Apply migrations in production mode
apply_production() {
    log "Applying migrations in production mode..."
    
    # Ensure we're in production mode
    export NODE_ENV=production
    
    # Run migrations
    docker-compose -f "$COMPOSE_FILE" run --rm \
        -e NODE_ENV=production \
        app npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"
    
    local status=${PIPESTATUS[0]}
    if [[ $status -eq 0 ]]; then
        success "Production migrations applied successfully"
    else
        error "Production migration failed"
        return 1
    fi
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Database Migration: $status - $message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
}

# Main function
main() {
    local command="${1:-status}"
    
    log "Starting database migration process..."
    log "Command: $command"
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Run prerequisites check
    check_prerequisites
    
    case "$command" in
        status)
            check_migration_status
            ;;
        deploy|up)
            backup_before_migration
            deploy_migrations
            ;;
        generate|create)
            generate_migration "${2:-migration}"
            ;;
        reset)
            reset_database
            ;;
        rollback|down)
            rollback_migration
            ;;
        validate)
            validate_migrations
            ;;
        seed)
            seed_database
            ;;
        production)
            backup_before_migration
            apply_production
            ;;
        *)
            error "Unknown command: $command"
            usage
            exit 1
            ;;
    esac
    
    success "Migration process completed!"
}

# Show usage
usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  status              Check migration status"
    echo "  deploy, up          Deploy pending migrations"
    echo "  generate, create    Generate a new migration (requires name)"
    echo "  reset               Reset database (DANGEROUS!)"
    echo "  rollback, down      Rollback to previous state"
    echo "  validate            Validate schema and migrations"
    echo "  seed                Seed database with initial data"
    echo "  production          Deploy migrations in production mode"
    echo ""
    echo "Examples:"
    echo "  $0 status                              Check migration status"
    echo "  $0 deploy                              Deploy all pending migrations"
    echo "  $0 generate add_user_preferences       Generate new migration"
    echo "  $0 rollback                            Rollback last migration"
    echo ""
    echo "Environment Variables:"
    echo "  COMPOSE_FILE        Docker Compose file path"
    echo "  DB_PASSWORD         Database password"
    echo "  BACKUP_DIR          Backup directory"
    echo "  SLACK_WEBHOOK_URL   Slack webhook URL"
}

# Parse arguments
if [[ $# -eq 0 ]]; then
    usage
    exit 0
fi

# Run main function
main "$@"
