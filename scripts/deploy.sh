#!/bin/bash

# Trading Platform - Production Deployment Script
# Usage: ./deploy.sh [environment] [version]
# Example: ./deploy.sh production v1.0.0

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
VERSION="${2:-latest}"
COMPOSE_FILE="docker/docker-compose.yml"
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/trading-platform/deploy-$(date +%Y%m%d-%H%M%S).log"

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

# Check if running as root for certain operations
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root for production deployment"
        exit 1
    fi
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running"
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        error "docker-compose is not installed"
        exit 1
    fi
    
    # Check if required files exist
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    # Check disk space
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ $DISK_USAGE -gt 80 ]]; then
        warning "Disk usage is at ${DISK_USAGE}%. Consider cleaning up before deployment."
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check memory
    MEMORY_AVAILABLE=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [[ $MEMORY_AVAILABLE -lt 1024 ]]; then
        warning "Available memory is low (${MEMORY_AVAILABLE}MB)"
    fi
    
    success "Pre-deployment checks passed"
}

# Create backup before deployment
backup_before_deploy() {
    log "Creating backup before deployment..."
    
    BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/pre-deploy-$BACKUP_TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup database
    log "Backing up database..."
    docker-compose -f "$COMPOSE_FILE" exec -T db pg_dump -U trading_platform trading_platform > "$BACKUP_PATH/database.sql" 2>/dev/null || {
        warning "Database backup failed, but continuing..."
    }
    
    # Backup Redis data
    log "Backing up Redis data..."
    docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli BGSAVE 2>/dev/null || {
        warning "Redis backup failed, but continuing..."
    }
    
    # Backup environment files
    log "Backing up environment files..."
    cp .env* "$BACKUP_PATH/" 2>/dev/null || true
    
    # Backup docker-compose file
    cp "$COMPOSE_FILE" "$BACKUP_PATH/"
    
    success "Backup created at $BACKUP_PATH"
}

# Pull latest images
pull_images() {
    log "Pulling Docker images..."
    
    export VERSION="$VERSION"
    docker-compose -f "$COMPOSE_FILE" pull
    
    success "Images pulled successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Start database if not running
    docker-compose -f "$COMPOSE_FILE" up -d db redis
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 10
    
    # Run migrations
    docker-compose -f "$COMPOSE_FILE" run --rm app npx prisma migrate deploy
    
    success "Database migrations completed"
}

# Deploy with zero downtime (blue-green deployment)
deploy_zero_downtime() {
    log "Starting zero-downtime deployment..."
    
    # Scale up new containers
    log "Scaling up new containers..."
    docker-compose -f "$COMPOSE_FILE" up -d --no-deps --scale app=4 app
    
    # Wait for health checks
    log "Waiting for health checks..."
    sleep 30
    
    # Verify new containers are healthy
    UNHEALTHY_CONTAINERS=$(docker-compose -f "$COMPOSE_FILE" ps -q app | xargs -I {} docker inspect --format='{{.State.Health.Status}}' {} | grep -v "healthy" | wc -l)
    
    if [[ $UNHEALTHY_CONTAINERS -gt 0 ]]; then
        error "Some containers are unhealthy. Rolling back..."
        rollback
        exit 1
    fi
    
    # Scale down old containers
    log "Scaling down old containers..."
    docker-compose -f "$COMPOSE_FILE" up -d --no-deps --scale app=2 app
    
    # Update other services
    log "Updating other services..."
    docker-compose -f "$COMPOSE_FILE" up -d --no-deps web nginx worker scheduler
    
    success "Deployment completed successfully"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check API health
    API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")
    if [[ $API_HEALTH != "200" ]]; then
        error "API health check failed (HTTP $API_HEALTH)"
        return 1
    fi
    
    # Check frontend
    FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/health || echo "000")
    if [[ $FRONTEND_HEALTH != "200" ]]; then
        error "Frontend health check failed (HTTP $FRONTEND_HEALTH)"
        return 1
    fi
    
    # Check database connection
    DB_HEALTH=$(docker-compose -f "$COMPOSE_FILE" exec -T db pg_isready -U trading_platform >/dev/null 2>&1 && echo "ok" || echo "fail")
    if [[ $DB_HEALTH != "ok" ]]; then
        error "Database health check failed"
        return 1
    fi
    
    # Check Redis connection
    REDIS_HEALTH=$(docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping 2>/dev/null || echo "FAIL")
    if [[ $REDIS_HEALTH != "PONG" ]]; then
        error "Redis health check failed"
        return 1
    fi
    
    success "All health checks passed"
}

# Rollback on failure
rollback() {
    error "Initiating rollback..."
    
    # Get previous version from backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/pre-deploy-* 2>/dev/null | head -1)
    
    if [[ -n "$LATEST_BACKUP" ]]; then
        log "Restoring from backup: $LATEST_BACKUP"
        
        # Restore database
        if [[ -f "$LATEST_BACKUP/database.sql" ]]; then
            docker-compose -f "$COMPOSE_FILE" exec -T db psql -U trading_platform trading_platform < "$LATEST_BACKUP/database.sql"
        fi
        
        # Restore docker-compose file
        cp "$LATEST_BACKUP/docker-compose.yml" "$COMPOSE_FILE"
        
        # Redeploy
        docker-compose -f "$COMPOSE_FILE" up -d
    else
        warning "No backup found for rollback"
    fi
    
    success "Rollback completed"
}

# Cleanup old resources
cleanup() {
    log "Cleaning up old resources..."
    
    # Remove old images
    docker image prune -af --filter "until=168h" 2>/dev/null || true
    
    # Remove old containers
    docker container prune -f 2>/dev/null || true
    
    # Remove old volumes
    docker volume prune -f 2>/dev/null || true
    
    # Remove old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "pre-deploy-*" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
    
    success "Cleanup completed"
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    # Slack notification (if webhook is configured)
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Trading Platform Deployment: $status - $message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
    
    # Email notification (if configured)
    if [[ -n "${ADMIN_EMAIL:-}" ]]; then
        echo "$message" | mail -s "Trading Platform Deployment: $status" "$ADMIN_EMAIL" 2>/dev/null || true
    fi
}

# Main deployment function
main() {
    log "Starting deployment to $ENVIRONMENT environment..."
    log "Version: $VERSION"
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Run deployment steps
    check_root
    pre_deployment_checks
    backup_before_deploy
    pull_images
    run_migrations
    
    if deploy_zero_downtime; then
        if verify_deployment; then
            cleanup
            success "Deployment completed successfully!"
            send_notification "SUCCESS" "Trading Platform deployed to $ENVIRONMENT (v$VERSION)"
        else
            error "Deployment verification failed"
            rollback
            send_notification "FAILED" "Trading Platform deployment to $ENVIRONMENT failed"
            exit 1
        fi
    else
        error "Deployment failed"
        rollback
        send_notification "FAILED" "Trading Platform deployment to $ENVIRONMENT failed"
        exit 1
    fi
}

# Handle script interruption
trap 'error "Deployment interrupted"; rollback; exit 1' INT TERM

# Run main function
main "$@"
