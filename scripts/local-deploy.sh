#!/bin/bash
# Trading Platform - Local Deployment Script
# Usage: ./scripts/local-deploy.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    cd "$(dirname "$0")/.."
    
    # Create .env from local template if it doesn't exist
    if [ ! -f ".env" ]; then
        cp .env.local .env
        log "Created .env file from .env.local template"
    fi
    
    success "Environment ready"
}

# Build and start services
start_services() {
    log "Building and starting services..."
    
    # Build images
    docker-compose build --no-cache
    
    # Start database and redis first
    docker-compose up -d db redis
    
    log "Waiting for database to be ready..."
    sleep 15
    
    # Run migrations
    log "Running database migrations..."
    docker-compose run --rm app npx prisma migrate deploy || {
        log "Migration may need to be run manually - continuing..."
    }
    
    # Start all services
    log "Starting all services..."
    docker-compose up -d
    
    success "All services started"
}

# Health check
health_check() {
    log "Running health checks..."
    
    sleep 10
    
    # Check API
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null || echo "000")
    if [ "$API_STATUS" = "200" ]; then
        success "API is healthy (http://localhost:3000)"
    else
        error "API health check failed (HTTP $API_STATUS)"
        docker-compose logs app --tail=20
    fi
    
    # Check frontend via nginx
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
    if [ "$FRONTEND_STATUS" = "200" ]; then
        success "Frontend is accessible (http://localhost)"
    else
        error "Frontend health check failed (HTTP $FRONTEND_STATUS)"
    fi
}

# Main
echo "=========================================="
echo "Trading Platform Local Deployment"
echo "=========================================="
echo ""

check_prerequisites
setup_environment
start_services
health_check

echo ""
echo "=========================================="
success "Deployment Complete!"
echo "=========================================="
echo ""
echo "Access your trading platform:"
echo "  - Frontend: http://localhost"
echo "  - API: http://localhost:3000"
echo "  - API Health: http://localhost:3000/health"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop:"
echo "  docker-compose down"
echo ""
echo "To stop and remove all data:"
echo "  docker-compose down -v"
echo ""
