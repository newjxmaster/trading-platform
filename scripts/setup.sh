#!/bin/bash

# Trading Platform - Initial Server Setup Script
# Run this script on a fresh server to prepare it for deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOMAIN="${DOMAIN:-tradingplatform.com}"
EMAIL="${EMAIL:-admin@tradingplatform.com}"
APP_DIR="/opt/trading-platform"
BACKUP_DIR="/opt/backups"
LOG_DIR="/var/log/trading-platform"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
        exit 1
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    
    apt-get update
    apt-get upgrade -y
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        software-properties-common \
        ufw \
        fail2ban \
        htop \
        vim \
        git \
        jq \
        unzip \
        awscli
    
    success "System packages updated"
}

# Install Docker
install_docker() {
    log "Installing Docker..."
    
    # Remove old versions
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Add Docker's official GPG key
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up the repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Start Docker
    systemctl start docker
    systemctl enable docker
    
    # Add current user to docker group
    usermod -aG docker "${SUDO_USER:-$USER}" 2>/dev/null || true
    
    success "Docker installed successfully"
}

# Install Docker Compose
install_docker_compose() {
    log "Installing Docker Compose..."
    
    # Install docker-compose standalone
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Create symlink
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    success "Docker Compose installed: $(docker-compose --version)"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    # Reset UFW
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow 22/tcp
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow specific ports for monitoring (optional)
    # ufw allow from MONITORING_IP to any port 9090
    
    # Enable UFW
    ufw --force enable
    
    success "Firewall configured"
}

# Install and configure Fail2Ban
setup_fail2ban() {
    log "Setting up Fail2Ban..."
    
    # Create custom configuration
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF
    
    # Start Fail2Ban
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    success "Fail2Ban configured"
}

# Create application directories
create_directories() {
    log "Creating application directories..."
    
    mkdir -p "$APP_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p /opt/certbot/conf
    mkdir -p /opt/certbot/www
    
    # Set permissions
    chown -R "${SUDO_USER:-$USER}:${SUDO_USER:-$USER}" "$APP_DIR"
    chown -R "${SUDO_USER:-$USER}:${SUDO_USER:-$USER}" "$BACKUP_DIR"
    
    success "Directories created"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    log "Setting up SSL with Let's Encrypt..."
    
    # Install Certbot
    apt-get install -y certbot
    
    # Create initial certificate
    certbot certonly --standalone \
        --agree-tos \
        --no-eff-email \
        --email "$EMAIL" \
        -d "$DOMAIN" \
        -d "api.$DOMAIN" \
        -d "admin.$DOMAIN" \
        --non-interactive 2>/dev/null || {
        warning "SSL certificate creation failed. Will retry with nginx later."
    }
    
    # Setup auto-renewal
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    success "SSL setup completed"
}

# Configure system limits
configure_system_limits() {
    log "Configuring system limits..."
    
    # Increase file descriptor limits
    cat >> /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
root soft nofile 65536
root hard nofile 65536
EOF
    
    # Increase system limits
    cat >> /etc/sysctl.conf << EOF
# Increase max connections
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# Increase port range
net.ipv4.ip_local_port_range = 1024 65535

# TCP optimization
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_keepalive_time = 300

# Memory settings
vm.swappiness = 10
vm.dirty_ratio = 40
vm.dirty_background_ratio = 10
EOF
    
    # Apply sysctl settings
    sysctl -p
    
    success "System limits configured"
}

# Setup log rotation
setup_log_rotation() {
    log "Setting up log rotation..."
    
    cat > /etc/logrotate.d/trading-platform << EOF
$LOG_DIR/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    sharedscripts
    postrotate
        /usr/bin/docker kill --signal="USR1" trading-platform-nginx 2>/dev/null || true
    endscript
}
EOF
    
    success "Log rotation configured"
}

# Setup monitoring agent (optional)
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Install Node Exporter for Prometheus
    NODE_EXPORTER_VERSION="1.6.1"
    cd /tmp
    curl -LO "https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz"
    tar xvfz "node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz"
    mv "node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64/node_exporter" /usr/local/bin/
    rm -rf "node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64"
    
    # Create systemd service
    cat > /etc/systemd/system/node-exporter.service << EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/node_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl start node-exporter
    systemctl enable node-exporter
    
    success "Monitoring agent installed"
}

# Create deployment user
create_deploy_user() {
    log "Creating deployment user..."
    
    DEPLOY_USER="deploy"
    
    # Create user if doesn't exist
    if ! id "$DEPLOY_USER" &>/dev/null; then
        useradd -m -s /bin/bash "$DEPLOY_USER"
        usermod -aG docker "$DEPLOY_USER"
        
        # Setup SSH key (if provided)
        if [[ -n "${DEPLOY_SSH_KEY:-}" ]]; then
            mkdir -p "/home/$DEPLOY_USER/.ssh"
            echo "$DEPLOY_SSH_KEY" > "/home/$DEPLOY_USER/.ssh/authorized_keys"
            chmod 700 "/home/$DEPLOY_USER/.ssh"
            chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
            chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
        fi
    fi
    
    success "Deployment user created"
}

# Clone application repository
clone_repository() {
    log "Cloning application repository..."
    
    cd "$APP_DIR"
    
    if [[ -d ".git" ]]; then
        log "Repository already exists, pulling latest changes..."
        git pull origin main
    else
        # Clone repository (replace with actual repository URL)
        git clone "https://github.com/your-org/trading-platform.git" .
    fi
    
    success "Repository cloned"
}

# Create environment file template
create_env_template() {
    log "Creating environment file template..."
    
    cat > "$APP_DIR/.env.example" << EOF
# Trading Platform Environment Configuration
# Copy this file to .env and fill in the values

# Server Configuration
NODE_ENV=production
PORT=3000
API_URL=https://api.$DOMAIN
FRONTEND_URL=https://$DOMAIN

# Database
DB_USER=trading_platform
DB_PASSWORD=$(openssl rand -base64 32)
DB_NAME=trading_platform
DATABASE_URL=postgresql://\${DB_USER}:\${DB_PASSWORD}@db:5432/\${DB_NAME}?schema=public

# Redis
REDIS_URL=redis://redis:6379

# JWT Secrets
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Payment APIs (fill in actual values)
WAVE_API_KEY=
WAVE_SECRET=
ORANGE_API_KEY=
ORANGE_SECRET=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Bank API
PARTNER_BANK_API_KEY=
PARTNER_BANK_SECRET=
PARTNER_BANK_BASE_URL=

# Web3
INFURA_API_KEY=
ETHEREUM_RPC_URL=
CRYPTO_DEPOSIT_ADDRESS=

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=us-east-1

# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Monitoring
SENTRY_DSN=
LOGROCKET_ID=

# Backup
BACKUP_S3_BUCKET=
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
EOF
    
    success "Environment template created at $APP_DIR/.env.example"
    warning "Please copy .env.example to .env and fill in the values"
}

# Main setup function
main() {
    log "Starting server setup for Trading Platform..."
    log "Domain: $DOMAIN"
    log "Email: $EMAIL"
    
    check_root
    update_system
    install_docker
    install_docker_compose
    configure_firewall
    setup_fail2ban
    create_directories
    setup_ssl
    configure_system_limits
    setup_log_rotation
    setup_monitoring
    create_deploy_user
    clone_repository
    create_env_template
    
    success "Server setup completed!"
    log ""
    log "Next steps:"
    log "1. Copy .env.example to .env and fill in the values"
    log "2. Run: docker-compose -f docker/docker-compose.yml up -d"
    log "3. Configure DNS to point to this server: $(curl -s ifconfig.me)"
    log ""
    log "Server IP: $(curl -s ifconfig.me)"
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -d, --domain DOMAIN     Set domain name (default: tradingplatform.com)"
    echo "  -e, --email EMAIL       Set admin email (default: admin@tradingplatform.com)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -d myplatform.com -e admin@myplatform.com"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -e|--email)
            EMAIL="$2"
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
