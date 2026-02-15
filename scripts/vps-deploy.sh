#!/bin/bash
# VPS Trading Platform Deployment Script
# Run this on the VPS to deploy the trading platform

set -e

REPO_URL="https://github.com/newjxmaster/trading-platform.git"
INSTALL_DIR="/opt/trading-platform"
DOMAIN="${1:-tradingplatform.local}"

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

# Check if running as root for some operations
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log "Installing Docker..."
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker $USER
        log "Docker installed. You may need to logout and login again."
    fi
    
    # Check docker-compose
    if ! command -v docker-compose &> /dev/null; then
        log "Installing Docker Compose..."
        sudo apt-get update
        sudo apt-get install -y docker-compose-plugin || {
            sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
        }
    fi
    
    success "Prerequisites check complete"
}

# Clone repository
clone_repo() {
    log "Cloning trading platform repository..."
    
    if [ -d "$INSTALL_DIR" ]; then
        log "Directory exists, pulling latest changes..."
        cd "$INSTALL_DIR"
        git pull origin main
    else
        sudo mkdir -p "$INSTALL_DIR"
        sudo git clone "$REPO_URL" "$INSTALL_DIR"
        sudo chown -R $USER:$USER "$INSTALL_DIR"
    fi
    
    success "Repository ready at $INSTALL_DIR"
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    cd "$INSTALL_DIR"
    
    # Copy staging env for initial setup (safer than production)
    if [ ! -f ".env" ]; then
        cp .env.staging .env
        
        # Generate secrets
        JWT_SECRET=$(openssl rand -base64 64 2>/dev/null || head -c 64 /dev/urandom | base64)
        JWT_REFRESH_SECRET=$(openssl rand -base64 64 2>/dev/null || head -c 64 /dev/urandom | base64)
        DB_PASSWORD=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
        
        # Update environment file
        sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        sed -i "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env
        sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
        sed -i "s/tradingplatform.com/$DOMAIN/g" .env
        
        success "Environment file created with generated secrets"
    else
        log "Environment file already exists, keeping existing configuration"
    fi
}

# Start services
start_services() {
    log "Starting services with Docker Compose..."
    
    cd "$INSTALL_DIR"
    
    # Start database and redis first
    docker-compose -f docker/docker-compose.yml up -d db redis
    
    log "Waiting for database to be ready..."
    sleep 15
    
    # Run migrations
    log "Running database migrations..."
    docker-compose -f docker/docker-compose.yml run --rm app npx prisma migrate deploy || {
        log "Migration may have already been applied or needs manual review"
    }
    
    # Seed database (optional)
    log "Seeding database..."
    docker-compose -f docker/docker-compose.yml run --rm app npx prisma db seed || {
        log "Seed may have already been applied"
    }
    
    # Seed admin user
    log "Creating admin user..."
    docker-compose -f docker/docker-compose.yml run --rm app npm run db:seed:admin || {
        log "Admin seed may have already been applied"
    }
    
    # Start all services
    log "Starting all services..."
    docker-compose -f docker/docker-compose.yml up -d
    
    success "All services started"
}

# Health check
health_check() {
    log "Running health checks..."
    
    sleep 10
    
    # Check API
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
    if [ "$API_STATUS" = "200" ]; then
        success "API is healthy"
    else
        error "API health check failed (HTTP $API_STATUS)"
        docker-compose -f docker/docker-compose.yml logs app --tail=20
    fi
    
    # Check frontend
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null || echo "000")
    if [ "$FRONTEND_STATUS" = "200" ] || [ "$FRONTEND_STATUS" = "301" ] || [ "$FRONTEND_STATUS" = "302" ]; then
        success "Frontend is accessible"
    else
        error "Frontend health check failed (HTTP $FRONTEND_STATUS)"
    fi
}

# Main
echo "=========================================="
echo "Trading Platform VPS Deployment"
echo "=========================================="
echo ""

check_prerequisites
clone_repo
setup_environment
start_services
health_check

echo ""
echo "=========================================="
success "Deployment Complete!"
echo "=========================================="
echo ""
echo "Access your trading platform:"
echo "  - API: http://$DOMAIN:3000/api"
echo "  - Frontend: http://$DOMAIN"
echo ""
echo "To view logs:"
echo "  cd $INSTALL_DIR && docker-compose -f docker/docker-compose.yml logs -f"
echo ""
echo "To stop:"
echo "  cd $INSTALL_DIR && docker-compose -f docker/docker-compose.yml down"
echo ""
